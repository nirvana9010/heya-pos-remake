import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { BookingStatusValue } from '../../domain/value-objects/booking-status.vo';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { OutboxEventRepository } from '../../../shared/outbox/infrastructure/outbox-event.repository';
import { OutboxEvent } from '../../../shared/outbox/domain/outbox-event.entity';
import { BookingServiceData } from '../commands/create-booking.command';
import { OrdersService } from '../../../../payments/orders.service';

interface CreateBookingData {
  staffId?: string; // Optional for multi-service bookings
  serviceId?: string; // Legacy single service
  services?: BookingServiceData[]; // New multi-service support
  customerId: string;
  startTime: Date;
  locationId?: string;
  merchantId: string;
  notes?: string;
  source: string;
  createdById: string;
  isOverride?: boolean;
  overrideReason?: string;
  orderId?: string; // Pre-created order ID to link
}

interface ServiceDetails {
  id: string;
  duration: number;
  price: number;
}

@Injectable()
export class BookingCreationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
    private readonly outboxRepository: OutboxEventRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Creates a booking with pessimistic locking to prevent double bookings.
   * This is a transactional script that orchestrates the entire booking creation process.
   */
  async createBooking(data: CreateBookingData): Promise<Booking> {
    // Handle special walk-in customer ID
    let finalCustomerId = data.customerId;
    if (data.customerId === 'WALK_IN') {
      // For bookings, we need to create/find an actual walk-in customer
      const walkInCustomer = await this.findOrCreateWalkInCustomer(data.merchantId);
      finalCustomerId = walkInCustomer.id;
    }
    
    // Convert legacy single service to services array
    const services: BookingServiceData[] = data.services || (data.serviceId ? [{
      serviceId: data.serviceId,
      staffId: data.staffId
    }] : []);

    if (services.length === 0) {
      throw new Error('At least one service is required');
    }

    const savedBooking = await this.prisma.$transaction(async (tx) => {
      // 1. Lock all staff members involved to prevent concurrent bookings
      const uniqueStaffIds = [...new Set(services
        .map(s => s.staffId || data.staffId)
        .filter(Boolean)
      )] as string[];
      
      for (const staffId of uniqueStaffIds) {
        await this.bookingRepository.lockStaff(staffId, data.merchantId, tx);
      }

      // 2. Fetch all service details and calculate total duration and pricing
      let totalAmount = 0;
      let totalDuration = 0;
      const serviceDetails: Array<ServiceDetails & { staffId?: string }> = [];
      
      for (const bookingService of services) {
        const service = await this.getServiceDetails(bookingService.serviceId, tx);
        if (!service) {
          throw new Error(`Service not found: ${bookingService.serviceId}`);
        }
        
        const duration = bookingService.duration || service.duration;
        const price = bookingService.price !== undefined ? bookingService.price : service.price;
        
        serviceDetails.push({
          ...service,
          duration,
          price,
          staffId: bookingService.staffId || data.staffId
        });
        
        totalAmount += price;
        totalDuration += duration;
      }

      const endTime = new Date(data.startTime.getTime() + totalDuration * 60 * 1000);

      // 3. Check staff schedules and business hours (unless merchant override)
      if (!data.isOverride) {
        await this.validateStaffSchedules(
          serviceDetails,
          data.startTime,
          data.merchantId,
          tx
        );
      }

      // 4. Check for conflicting bookings for each staff-service combination
      let currentStartTime = new Date(data.startTime);
      
      for (const serviceDetail of serviceDetails) {
        const serviceEndTime = new Date(currentStartTime.getTime() + serviceDetail.duration * 60 * 1000);
        const staffId = serviceDetail.staffId;
        
        if (staffId) {
          const conflicts = await this.bookingRepository.findConflictingBookings(
            staffId,
            currentStartTime,
            serviceEndTime,
            data.merchantId,
            undefined,
            tx
          );

          if (conflicts.length > 0 && !data.isOverride) {
            // Fetch staff name for better error message
            const staff = await tx.staff.findUnique({
              where: { id: staffId },
              select: { firstName: true, lastName: true }
            });
            
            const staffName = staff 
              ? `${staff.firstName}${staff.lastName ? ' ' + staff.lastName : ''}`
              : `Staff ID: ${staffId}`;
            
            const conflictInfo = conflicts.map(c => ({
              id: c.id,
              startTime: c.timeSlot.start,
              endTime: c.timeSlot.end,
              status: c.status.value,
              staffId: staffId,
              staffName: staffName,
              serviceId: serviceDetail.id
            }));
            throw new ConflictException({
              message: `Time slot has conflicts for ${staffName}`,
              conflicts: conflictInfo,
            });
          }
        }
        
        currentStartTime = serviceEndTime;
      }

      // 5. Generate booking number
      const bookingNumber = await this.generateBookingNumber(data.merchantId, tx);

      // 6. Get merchant settings to check auto-confirm setting
      const merchant = await tx.merchant.findUnique({
        where: { id: data.merchantId },
        select: { settings: true },
      });

      const merchantSettings = merchant?.settings as any;
      const autoConfirmBookings = merchantSettings?.autoConfirmBookings ?? true; // Default to true for backward compatibility

      // 7. Create the booking domain entity
      // For now, use the first service for the main booking (will be updated in domain entity)
      const primaryStaffId = serviceDetails[0]?.staffId || data.staffId;
      
      // Auto-confirm only applies to ONLINE bookings (from booking app)
      // In-person bookings created in merchant app are always CONFIRMED
      const shouldAutoConfirm = data.source === 'ONLINE' ? autoConfirmBookings : true;
      
      // Debug logging
      console.log('[BookingCreationService] Status determination:', {
        bookingSource: data.source,
        autoConfirmBookings: autoConfirmBookings,
        shouldAutoConfirm: shouldAutoConfirm,
        resultingStatus: shouldAutoConfirm ? 'CONFIRMED' : 'PENDING',
      });
      
      const booking = new Booking({
        id: uuidv4(),
        bookingNumber,
        merchantId: data.merchantId,
        customerId: finalCustomerId,
        staffId: primaryStaffId,
        serviceId: serviceDetails[0].id, // Temporary, will update domain to support array
        locationId: data.locationId,
        timeSlot: new TimeSlot(data.startTime, endTime),
        status: shouldAutoConfirm ? BookingStatusValue.CONFIRMED : BookingStatusValue.PENDING,
        totalAmount,
        depositAmount: 0, // TODO: Calculate based on merchant settings
        notes: data.notes,
        source: data.source,
        createdById: data.createdById,
        isOverride: data.isOverride || false,
        overrideReason: data.overrideReason,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: serviceDetails, // Pass services for repository to handle
      } as any); // Temporary cast until domain entity is updated

      // 8. Persist the booking with all services
      const savedBooking = await this.bookingRepository.save(booking, tx, serviceDetails);

      // 9. Save booking created event to outbox
      const outboxEvent = OutboxEvent.create({
        aggregateId: savedBooking.id,
        aggregateType: 'booking',
        eventType: 'created',
        eventData: {
          bookingId: savedBooking.id,
          bookingNumber: savedBooking.bookingNumber,
          customerId: savedBooking.customerId,
          staffId: primaryStaffId,
          serviceIds: serviceDetails.map(s => s.id),
          locationId: savedBooking.locationId,
          startTime: savedBooking.timeSlot.start,
          endTime: savedBooking.timeSlot.end,
          status: savedBooking.status.value,
          totalAmount: savedBooking.totalAmount,
          source: savedBooking.source,
        },
        eventVersion: 1,
        merchantId: savedBooking.merchantId,
      });

      await this.outboxRepository.save(outboxEvent, tx);

      // Emit event immediately for real-time notifications
      // This is in addition to the OutboxPublisher which provides reliability
      this.eventEmitter.emit('booking.created', {
        aggregateId: savedBooking.id,
        merchantId: savedBooking.merchantId,
        bookingId: savedBooking.id,
        bookingNumber: savedBooking.bookingNumber,
        customerId: savedBooking.customerId,
        staffId: primaryStaffId,
        serviceIds: serviceDetails.map(s => s.id),
        locationId: savedBooking.locationId,
        startTime: savedBooking.timeSlot.start,
        endTime: savedBooking.timeSlot.end,
        status: savedBooking.status.value,
        totalAmount: savedBooking.totalAmount,
        source: savedBooking.source,
      });

      // 10. Link pre-created order if provided
      if (data.orderId) {
        await this.linkOrderToBooking(data.orderId, savedBooking.id, tx);
      }

      return savedBooking;
    }, {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });

    // Order creation moved to background process for better performance
    // Order will be created when payment is initiated or by background job
    // Unless a pre-created order was already linked above
    
    return savedBooking;
  }

  /**
   * Link a pre-created order to a booking
   */
  private async linkOrderToBooking(
    orderId: string,
    bookingId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    // Get the booking details to update the order
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found for order linking');
    }

    // Calculate totals from booking services
    let subtotal = 0;
    const orderItems = [];

    for (const bookingService of booking.services) {
      const price = typeof bookingService.price === 'object' && bookingService.price !== null && 'toNumber' in bookingService.price
        ? bookingService.price.toNumber()
        : Number(bookingService.price);
      
      subtotal += price;
      
      orderItems.push({
        serviceId: bookingService.serviceId,
        name: bookingService.service.name,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
      });
    }

    // Update the order with booking details
    await tx.order.update({
      where: { id: orderId },
      data: { 
        bookingId: bookingId,
        customerId: booking.customerId,
        subtotal: subtotal,
        totalAmount: subtotal, // Will be recalculated with tax/discounts later
        balanceDue: subtotal,
      },
    });

    // Create order items
    if (orderItems.length > 0) {
      await tx.orderItem.createMany({
        data: orderItems.map(item => ({
          orderId: orderId,
          ...item,
        })),
      });
    }
  }

  /**
   * Get service details including duration and price
   */
  private async getServiceDetails(
    serviceId: string,
    tx: Prisma.TransactionClient
  ): Promise<ServiceDetails | null> {
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        duration: true,
        price: true,
      },
    });

    if (!service) {
      return null;
    }

    return {
      id: service.id,
      duration: service.duration,
      price: typeof service.price === 'object' && service.price !== null && 'toNumber' in service.price
        ? service.price.toNumber()
        : Number(service.price),
    };
  }

  /**
   * Validate that booking times fall within staff schedules
   */
  private async validateStaffSchedules(
    serviceDetails: Array<ServiceDetails & { staffId?: string }>,
    startTime: Date,
    merchantId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    // Get merchant business hours
    const merchant = await tx.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    const businessHours = (merchant?.settings as any)?.businessHours;
    if (!businessHours) {
      throw new Error('Business hours not configured');
    }

    const dayOfWeek = startTime.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayHours = businessHours[dayName];

    // Check if business is open on this day
    if (!dayHours?.isOpen) {
      throw new ConflictException('Business is closed on this day');
    }

    let currentStartTime = new Date(startTime);

    // Validate each service against staff schedule
    for (const serviceDetail of serviceDetails) {
      const serviceEndTime = new Date(currentStartTime.getTime() + serviceDetail.duration * 60 * 1000);
      const staffId = serviceDetail.staffId;

      if (staffId) {
        // Get staff schedule for this day
        const staffSchedule = await tx.staffSchedule.findFirst({
          where: {
            staffId,
            dayOfWeek,
          },
        });

        if (!staffSchedule) {
          // Fetch staff name for better error message
          const staff = await tx.staff.findUnique({
            where: { id: staffId },
            select: { firstName: true, lastName: true },
          });
          
          const staffName = staff 
            ? `${staff.firstName}${staff.lastName ? ' ' + staff.lastName : ''}`
            : `Staff ID: ${staffId}`;

          throw new ConflictException(
            `${staffName} is not available on ${dayName}`
          );
        }

        // Check if booking time is within staff schedule
        const bookingStartTime = `${currentStartTime.getHours().toString().padStart(2, '0')}:${currentStartTime.getMinutes().toString().padStart(2, '0')}`;
        const bookingEndTime = `${serviceEndTime.getHours().toString().padStart(2, '0')}:${serviceEndTime.getMinutes().toString().padStart(2, '0')}`;

        if (bookingStartTime < staffSchedule.startTime || bookingEndTime > staffSchedule.endTime) {
          const staff = await tx.staff.findUnique({
            where: { id: staffId },
            select: { firstName: true, lastName: true },
          });
          
          const staffName = staff 
            ? `${staff.firstName}${staff.lastName ? ' ' + staff.lastName : ''}`
            : `Staff ID: ${staffId}`;

          throw new ConflictException(
            `${staffName} is only available from ${staffSchedule.startTime} to ${staffSchedule.endTime} on ${dayName}`
          );
        }

        // Also check against business hours
        if (bookingStartTime < dayHours.open || bookingEndTime > dayHours.close) {
          throw new ConflictException(
            `Booking time must be within business hours (${dayHours.open} - ${dayHours.close})`
          );
        }
      }

      currentStartTime = serviceEndTime;
    }
  }

  /**
   * Generate a unique booking number with format: BK{timestamp}{random}
   */
  private async generateBookingNumber(
    merchantId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    // Use timestamp + random string for uniqueness
    // No need to use count which can cause race conditions
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BK${timestamp}${random}`.toUpperCase();
  }

  /**
   * Find or create a walk-in customer for the merchant
   */
  private async findOrCreateWalkInCustomer(merchantId: string) {
    // First, try to find existing walk-in customer for this merchant
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { subdomain: true }
    });
    
    const walkInEmail = `walkin@${merchant?.subdomain || 'unknown'}.local`;
    
    // Try to find existing walk-in customer
    let walkInCustomer = await this.prisma.customer.findFirst({
      where: {
        merchantId,
        OR: [
          { email: walkInEmail },
          {
            firstName: 'Walk-in',
            lastName: 'Customer',
            source: 'WALK_IN'
          }
        ]
      }
    });

    // If not found, create new walk-in customer
    if (!walkInCustomer) {
      walkInCustomer = await this.prisma.customer.create({
        data: {
          merchantId,
          firstName: 'Walk-in',
          lastName: 'Customer',
          email: walkInEmail,
          source: 'WALK_IN',
          status: 'ACTIVE',
          marketingConsent: false,
          preferredLanguage: 'en',
          loyaltyPoints: 0,
          visitCount: 0,
          totalSpent: 0,
          tags: []
        }
      });
    }

    return walkInCustomer;
  }


}