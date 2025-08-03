import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { Prisma } from '@prisma/client';
import { BookingMapper } from '../../infrastructure/persistence/booking.mapper';
import { LoyaltyService } from '../../../../loyalty/loyalty.service';
import { CacheService } from '../../../../common/cache/cache.service';
import { OutboxEventRepository } from '../../../shared/outbox/infrastructure/outbox-event.repository';
import { OutboxEvent } from '../../../shared/outbox/domain/outbox-event.entity';

interface UpdateBookingData {
  bookingId: string;
  merchantId: string;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
  staffId?: string;
  serviceId?: string;  // Keep for backward compatibility
  services?: Array<{    // NEW: Add services array
    serviceId: string;
    staffId?: string;
    price?: number;
    duration?: number;
  }>;
  locationId?: string;
  status?: string;
  cancellationReason?: string;
}

interface CancelBookingData {
  bookingId: string;
  merchantId: string;
  reason: string;
  cancelledBy: string;
}

@Injectable()
export class BookingUpdateService {
  private readonly logger = new Logger(BookingUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
    private readonly loyaltyService: LoyaltyService,
    private readonly cacheService: CacheService,
    private readonly outboxRepository: OutboxEventRepository,
  ) {}

  /**
   * Updates a booking with optional rescheduling
   */
  async updateBooking(data: UpdateBookingData): Promise<Booking> {
    
    let originalBooking: Booking | null = null;
    let isRescheduling = false;
    let wasStatusConfirmed = false;
    
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      // 1. Get the existing booking
      const booking = await this.bookingRepository.findById(data.bookingId, data.merchantId);
      if (!booking) {
        throw new NotFoundException(`Booking not found: ${data.bookingId}`);
      }
      
      originalBooking = booking;

      // 2. Check if we're rescheduling (time change)
      isRescheduling = data.startTime && (
        data.startTime.getTime() !== booking.timeSlot.start.getTime() ||
        (data.endTime && data.endTime.getTime() !== booking.timeSlot.end.getTime())
      );

      if (isRescheduling) {
        // 3. Lock the staff member if we're changing time
        const staffId = data.staffId || booking.staffId;
        await this.bookingRepository.lockStaff(staffId, data.merchantId, tx);

        // 4. Check for conflicts with the new time
        const startTime = data.startTime;
        const endTime = data.endTime || new Date(startTime.getTime() + 
          (booking.timeSlot.end.getTime() - booking.timeSlot.start.getTime()));

        const conflicts = await this.bookingRepository.findConflictingBookings(
          staffId,
          startTime,
          endTime,
          data.merchantId,
          data.bookingId, // Exclude current booking
          tx
        );

        if (conflicts.length > 0) {
          // Fetch staff name for better error message
          const staff = await tx.staff.findUnique({
            where: { id: staffId },
            select: { firstName: true, lastName: true }
          });
          
          const staffName = staff 
            ? `${staff.firstName}${staff.lastName ? ' ' + staff.lastName : ''}`
            : `Staff ID: ${staffId}`;
          
          throw new BadRequestException({
            message: `Time slot has conflicts for ${staffName}`,
            conflicts: conflicts.map(c => ({
              id: c.id,
              startTime: c.timeSlot.start,
              endTime: c.timeSlot.end,
              status: c.status.value,
              staffId: staffId,
              staffName: staffName,
            })),
          });
        }

        // 5. Reschedule the booking
        const newTimeSlot = new TimeSlot(startTime, endTime);
        booking.reschedule(newTimeSlot);
      }

      // 6. Update other fields that need direct database updates
      const directUpdates: any = {};
      if (data.notes !== undefined) {
        directUpdates.notes = data.notes;
      }
      // Note: serviceId field doesn't exist on Booking table anymore - using BookingService relation
      if (data.locationId && data.locationId !== booking.locationId) {
        directUpdates.locationId = data.locationId;
      }

      // 6a. Handle backward compatibility - convert single serviceId to services array
      let servicesToUpdate = data.services;
      if (!servicesToUpdate && data.serviceId) {
        console.log('[BOOKING UPDATE SERVICE] Converting single serviceId to services array for backward compatibility');
        servicesToUpdate = [{
          serviceId: data.serviceId,
          staffId: data.staffId || booking.staffId,
          price: undefined,
          duration: undefined
        }];
      }

      // 6b. Handle multi-service updates
      if (servicesToUpdate && servicesToUpdate.length > 0) {
        console.log(`[BOOKING UPDATE SERVICE] Processing ${servicesToUpdate.length} services for booking ${data.bookingId}`);
        console.log('[BOOKING UPDATE SERVICE] Services to update:', servicesToUpdate);
        
        // Delete existing BookingService records
        const deletedCount = await tx.bookingService.deleteMany({
          where: { bookingId: data.bookingId }
        });
        console.log(`[BOOKING UPDATE SERVICE] Deleted ${deletedCount.count} existing BookingService records`);
        
        // Calculate total amount and duration
        let totalAmount = 0;
        let totalDuration = 0;
        
        // Create new BookingService records
        const bookingServices = [];
        for (const service of servicesToUpdate) {
          // Fetch service details if price/duration not provided
          const serviceDetails = await tx.service.findUnique({
            where: { id: service.serviceId },
            select: { price: true, duration: true }
          });
          
          if (!serviceDetails) {
            throw new BadRequestException(`Service not found: ${service.serviceId}`);
          }
          
          const servicePrice = service.price ?? serviceDetails.price;
          const serviceDuration = service.duration ?? serviceDetails.duration;
          
          bookingServices.push({
            bookingId: data.bookingId,
            serviceId: service.serviceId,
            staffId: service.staffId || data.staffId || booking.staffId,
            price: servicePrice,
            duration: serviceDuration
          });
          
          totalAmount += Number(servicePrice);
          totalDuration += serviceDuration;
        }
        
        // Create all BookingService records
        console.log(`[BOOKING UPDATE SERVICE] Creating ${bookingServices.length} new BookingService records`);
        const createResult = await tx.bookingService.createMany({
          data: bookingServices
        });
        console.log(`[BOOKING UPDATE SERVICE] Created ${createResult.count} BookingService records`);
        
        // Update main booking fields (no serviceId field to update)
        directUpdates.totalAmount = totalAmount;
        console.log(`[BOOKING UPDATE SERVICE] Updated totalAmount to ${totalAmount}`);
        
        // Recalculate endTime based on new total duration if not explicitly provided
        if (!data.endTime && totalDuration > 0 && !isRescheduling) {
          const startTime = data.startTime || booking.timeSlot.start;
          const newEndTime = new Date(
            startTime.getTime() + totalDuration * 60000
          );
          directUpdates.endTime = newEndTime;
        }
      }

      // 7. Handle staff change if needed
      if (data.staffId && data.staffId !== booking.staffId) {
        directUpdates.providerId = data.staffId;
      }
      
      // 8. Handle status change if needed
      let previousStatus: string | undefined;
      if (data.status) {
        // Get the current status before update
        previousStatus = booking.status.value;
        
        // Status should be uppercase in the database
        const newStatus = data.status.toUpperCase().replace(/-/g, '_');
        directUpdates.status = newStatus;
        
        // Check if we're confirming a pending booking
        this.logger.log(`Status change detected: ${previousStatus} → ${newStatus}`);
        if (previousStatus === 'PENDING' && newStatus === 'CONFIRMED') {
          wasStatusConfirmed = true;
          this.logger.log(`✅ Detected PENDING → CONFIRMED transition`);
        }
        
        // If cancelling, add cancellation data
        if (data.status.toUpperCase() === 'CANCELLED' || data.status === 'cancelled') {
          directUpdates.cancelledAt = new Date();
          if (data.cancellationReason) {
            directUpdates.cancellationReason = data.cancellationReason;
          }
        }
      }

      // 9. Save the updated booking (for domain-level changes like time)
      const updatedBooking = await this.bookingRepository.update(booking, tx);
      
      // 10. Apply any direct database updates AFTER the domain update
      const hasDirectUpdates = Object.keys(directUpdates).length > 0;
      if (hasDirectUpdates) {
        await tx.booking.update({
          where: {
            id: booking.id,
            merchantId: data.merchantId,
          },
          data: directUpdates,
        });
      }

      // 11. Create outbox events within the same transaction
      if (isRescheduling && originalBooking && data.startTime) {
        // Calculate the new end time if not provided
        const newEndTime = data.endTime || new Date(data.startTime.getTime() + 
          (originalBooking.timeSlot.end.getTime() - originalBooking.timeSlot.start.getTime()));
        
        const rescheduledEvent = OutboxEvent.create({
          aggregateId: data.bookingId,
          aggregateType: 'booking',
          eventType: 'rescheduled',
          eventData: { 
            bookingId: data.bookingId,
            oldStartTime: originalBooking.timeSlot.start,
            newStartTime: data.startTime,
            oldEndTime: originalBooking.timeSlot.end,
            newEndTime: newEndTime,
          },
          eventVersion: 1,
          merchantId: data.merchantId,
        });
        await this.outboxRepository.save(rescheduledEvent, tx);
      }

      // Create outbox event if booking was confirmed from pending
      if (wasStatusConfirmed) {
        this.logger.log(`======= CONFIRMATION FLOW DEBUG =======`);
        this.logger.log(`Booking ${data.bookingId} status changed: PENDING → CONFIRMED`);
        this.logger.log(`Creating outbox event for confirmation email...`);
        
        
        const confirmedEvent = OutboxEvent.create({
          aggregateId: data.bookingId,
          aggregateType: 'booking',
          eventType: 'confirmed',
          eventData: { 
            bookingId: data.bookingId,
            previousStatus: 'PENDING',
            newStatus: 'CONFIRMED',
          },
          eventVersion: 1,
          merchantId: data.merchantId,
        });
        
        this.logger.log(`Outbox event object created:`, {
          id: confirmedEvent.id,
          aggregateType: confirmedEvent.aggregateType,
          eventType: confirmedEvent.eventType,
          merchantId: confirmedEvent.merchantId
        });
        
        await this.outboxRepository.save(confirmedEvent, tx);
        this.logger.log(`✓ Outbox event saved to database`);
        this.logger.log(`======= END CONFIRMATION FLOW DEBUG =======`);
      }
      
      // Create outbox event if services were updated
      if (servicesToUpdate && servicesToUpdate.length > 0) {
        // Fetch the updated booking to get all service details
        const updatedBookingWithServices = await tx.booking.findUnique({
          where: { id: data.bookingId },
          include: {
            services: {
              include: {
                service: true,
                staff: true,
              },
            },
          },
        });
        
        const servicesUpdatedEvent = OutboxEvent.create({
          aggregateId: data.bookingId,
          aggregateType: 'booking',
          eventType: 'services_updated',
          eventData: {
            bookingId: data.bookingId,
            services: updatedBookingWithServices.services.map(s => ({
              serviceId: s.serviceId,
              serviceName: s.service.name,
              staffId: s.staffId,
              staffName: s.staff ? `${s.staff.firstName} ${s.staff.lastName || ''}`.trim() : null,
              price: Number(s.price),
              duration: s.duration,
            })),
            totalAmount: Number(updatedBookingWithServices.totalAmount),
            totalDuration: updatedBookingWithServices.services.reduce((sum, s) => sum + s.duration, 0),
          },
          eventVersion: 1,
          merchantId: data.merchantId,
        });
        
        await this.outboxRepository.save(servicesUpdatedEvent, tx);
        this.logger.log(`✓ Services updated event saved to outbox`);
      }

      // 12. Reload the booking if we had direct updates
      if (hasDirectUpdates) {
        const reloadedBooking = await tx.booking.findUnique({
          where: {
            id: booking.id,
            merchantId: data.merchantId,
          },
          include: {
            services: {
              include: {
                service: true,
                staff: true,
              },
            },
            customer: true,
            provider: true,
            location: true,
          },
        });
        
        if (!reloadedBooking) {
          throw new Error('Failed to reload booking after update');
        }
        
        const domainBooking = BookingMapper.toDomain(reloadedBooking);
        return domainBooking;
      }
      
      return updatedBooking;
    }, {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });

    // Invalidate cache for this merchant's bookings
    await this.cacheService.deletePattern(`${data.merchantId}:bookings-list:.*`);
    await this.cacheService.deletePattern(`${data.merchantId}:calendar-view:.*`);
    console.log(`[BookingUpdateService] Cache invalidated for merchant ${data.merchantId}`);

    return updatedBooking;
  }

  /**
   * Starts a booking (changes status to IN_PROGRESS)
   */
  async startBooking(bookingId: string, merchantId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId, merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    const previousStatus = booking.status;
    booking.start();
    const updatedBooking = await this.bookingRepository.update(booking);
    
    // Invalidate cache for this merchant's bookings
    await this.cacheService.deletePattern(`${merchantId}:bookings-list:.*`);
    await this.cacheService.deletePattern(`${merchantId}:calendar-view:.*`);
    
    
    return updatedBooking;
  }

  /**
   * Completes a booking (changes status to COMPLETED)
   */
  async completeBooking(bookingId: string, merchantId: string): Promise<Booking> {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await this.bookingRepository.findById(bookingId, merchantId);
      if (!booking) {
        throw new NotFoundException(`Booking not found: ${bookingId}`);
      }

      const previousStatus = booking.status;
      booking.complete();
      const updatedBooking = await this.bookingRepository.update(booking);
      
      // Create outbox event for completed booking
      const outboxEvent = OutboxEvent.create({
        aggregateId: booking.id,
        aggregateType: 'booking',
        eventType: 'completed',
        eventData: { bookingId: booking.id },
        eventVersion: 1,
        merchantId: booking.merchantId,
      });
      await this.outboxRepository.save(outboxEvent, tx);
      
      return updatedBooking;
    });
    
    // Invalidate cache for this merchant's bookings
    await this.cacheService.deletePattern(`${merchantId}:bookings-list:.*`);
    await this.cacheService.deletePattern(`${merchantId}:calendar-view:.*`);
    console.log(`[BookingUpdateService] Cache invalidated for merchant ${merchantId}`);
    
    // Update customer stats (visits and total spent)
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { 
          customerId: true, 
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true 
        }
      });
      
      if (booking?.customerId) {
        // Only update stats if booking wasn't already paid (to avoid double counting)
        if (booking.paymentStatus !== 'PAID') {
          await this.prisma.customer.update({
            where: { id: booking.customerId },
            data: {
              visitCount: { increment: 1 },
              lifetimeVisits: { increment: 1 },
              totalSpent: { increment: booking.paidAmount || booking.totalAmount || 0 }
            }
          });
          console.log(`[BookingUpdateService] Customer stats updated for completed booking ${bookingId}`);
        } else {
          console.log(`[BookingUpdateService] Skipping stats update for booking ${bookingId} - already counted when paid`);
        }
      }
    } catch (error) {
      console.error(`[BookingUpdateService] Failed to update customer stats for booking ${bookingId}:`, error);
    }
    
    // Process loyalty points/visits accrual (if loyalty program exists)
    try {
      await this.loyaltyService.processBookingCompletion(bookingId);
      console.log(`[BookingUpdateService] Loyalty processed for booking ${bookingId}`);
    } catch (error) {
      // Log error but don't fail the booking completion
      console.error(`[BookingUpdateService] Failed to process loyalty for booking ${bookingId}:`, error);
      // In production, this should be handled by a retry mechanism or event system
    }
    
    return result;
  }

  /**
   * Cancels a booking with reason
   */
  async cancelBooking(data: CancelBookingData): Promise<Booking> {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await this.bookingRepository.findById(data.bookingId, data.merchantId);
      if (!booking) {
        throw new NotFoundException(`Booking not found: ${data.bookingId}`);
      }

      booking.cancel(data.reason, data.cancelledBy);
      const updatedBooking = await this.bookingRepository.update(booking, tx);
      
      // Create and save the booking cancelled event to outbox
      const outboxEvent = OutboxEvent.create({
        aggregateId: booking.id,
        aggregateType: 'booking',
        eventType: 'cancelled',
        eventData: {
          bookingId: booking.id,
        },
        eventVersion: 1,
        merchantId: booking.merchantId,
      });

      await this.outboxRepository.save(outboxEvent, tx);
      
      return updatedBooking;
    });
    
    // Invalidate cache for this merchant's bookings
    await this.cacheService.deletePattern(`${data.merchantId}:bookings-list:.*`);
    await this.cacheService.deletePattern(`${data.merchantId}:calendar-view:.*`);
    
    return result;
  }

  /**
   * Marks a booking as no-show
   */
  async markNoShow(bookingId: string, merchantId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId, merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    booking.markAsNoShow();
    return await this.bookingRepository.update(booking);
  }

  /**
   * Marks a booking as paid - OPTIMIZED FOR PERFORMANCE
   */
  async markBookingAsPaid(
    bookingId: string,
    merchantId: string,
    paymentMethod: string,
    amount?: number,
    reference?: string,
  ): Promise<any> {
    const now = new Date();
    
    try {
      // First get the booking to know the totalAmount if amount not provided
      if (!amount) {
        const booking = await this.prisma.booking.findFirst({
          where: { id: bookingId, merchantId },
          select: { totalAmount: true },
        });
        if (booking) {
          amount = Number(booking.totalAmount);
        }
      }
      
      // Single atomic update - no transaction, no separate select!
      const result = await this.prisma.booking.updateMany({
        where: {
          id: bookingId,
          merchantId,
          paymentStatus: { notIn: ['PAID', 'REFUNDED'] },
        },
        data: {
          paymentStatus: 'PAID',
          paidAmount: amount,
          paymentMethod,
          paymentReference: reference,
          paidAt: now,
          updatedAt: now,
        },
      });

      if (result.count === 0) {
        // Check if booking exists and is already paid
        const exists = await this.prisma.booking.count({
          where: { id: bookingId, merchantId },
        });
        
        if (exists === 0) {
          throw new NotFoundException(`Booking not found: ${bookingId}`);
        }
        throw new BadRequestException('Cannot mark booking as paid in PAID status');
      }

      // Fetch the updated booking data in a single query
      const updated = await this.prisma.booking.findFirst({
        where: { id: bookingId, merchantId },
        select: {
          id: true,
          bookingNumber: true,
          totalAmount: true,
          paymentStatus: true,
          paidAmount: true,
          paymentMethod: true,
          paidAt: true,
        },
      });

      if (!updated) {
        throw new Error('Failed to fetch updated booking');
      }

      // paidAmount is already set in the update above

      // Update customer stats when booking is marked as paid
      try {
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          select: { 
            customerId: true,
            totalAmount: true,
            paidAmount: true
          }
        });
        
        if (booking?.customerId) {
          // Increment visit count and total spent when booking is paid
          await this.prisma.customer.update({
            where: { id: booking.customerId },
            data: {
              visitCount: { increment: 1 },
              lifetimeVisits: { increment: 1 },
              totalSpent: { increment: booking.paidAmount || booking.totalAmount || 0 }
            }
          });
          console.log(`[BookingUpdateService] Customer stats updated for paid booking ${bookingId}`);
        }
      } catch (error) {
        console.error(`[BookingUpdateService] Failed to update customer stats for paid booking ${bookingId}:`, error);
      }

      // Invalidate cache for this merchant's bookings
      await this.cacheService.deletePattern(`${merchantId}:bookings-list:.*`);
      await this.cacheService.deletePattern(`${merchantId}:calendar-view:.*`);
      console.log(`[BookingUpdateService] Cache invalidated for merchant ${merchantId} after marking as paid`);


      return updated;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Records a partial payment for a booking
   */
  async recordPartialPayment(
    bookingId: string,
    merchantId: string,
    amount: number,
    paymentMethod: string,
    reference?: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId, merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    booking.recordPartialPayment(amount, paymentMethod, reference);
    const updatedBooking = await this.bookingRepository.update(booking);
    
    // Payment recorded successfully
    
    return updatedBooking;
  }

  /**
   * Refunds a payment for a booking
   */
  async refundPayment(
    bookingId: string,
    merchantId: string,
    amount: number,
    reason: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId, merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    booking.refundPayment(amount, reason);
    const updatedBooking = await this.bookingRepository.update(booking);
    
    // Refund processed successfully
    
    return updatedBooking;
  }
}