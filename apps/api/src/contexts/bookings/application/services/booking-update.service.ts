import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { Prisma } from '@prisma/client';
import { BookingMapper } from '../../infrastructure/persistence/booking.mapper';

interface UpdateBookingData {
  bookingId: string;
  merchantId: string;
  startTime?: Date;
  endTime?: Date;
  notes?: string;
  staffId?: string;
  serviceId?: string;
  locationId?: string;
}

interface CancelBookingData {
  bookingId: string;
  merchantId: string;
  reason: string;
  cancelledBy: string;
}

@Injectable()
export class BookingUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
  ) {}

  /**
   * Updates a booking with optional rescheduling
   */
  async updateBooking(data: UpdateBookingData): Promise<Booking> {
    console.log('[BookingUpdateService] Updating booking:', {
      bookingId: data.bookingId,
      hasStaffChange: !!data.staffId,
      newStaffId: data.staffId,
      hasTimeChange: !!data.startTime,
    });
    
    return this.prisma.$transaction(async (tx) => {
      // 1. Get the existing booking
      const booking = await this.bookingRepository.findById(data.bookingId, data.merchantId);
      if (!booking) {
        throw new NotFoundException(`Booking not found: ${data.bookingId}`);
      }
      
      console.log('[BookingUpdateService] Current booking:', {
        bookingId: booking.id,
        currentStaffId: booking.staffId,
        requestedStaffId: data.staffId,
        needsStaffChange: data.staffId && data.staffId !== booking.staffId,
      });

      // 2. Check if we're rescheduling (time change)
      const isRescheduling = data.startTime && (
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
          throw new BadRequestException({
            message: 'Time slot has conflicts',
            conflicts: conflicts.map(c => ({
              id: c.id,
              startTime: c.timeSlot.start,
              endTime: c.timeSlot.end,
              status: c.status.value,
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
      if (data.serviceId && data.serviceId !== booking.serviceId) {
        directUpdates.serviceId = data.serviceId;
      }
      if (data.locationId && data.locationId !== booking.locationId) {
        directUpdates.locationId = data.locationId;
      }

      // 7. Handle staff change if needed
      if (data.staffId && data.staffId !== booking.staffId) {
        directUpdates.providerId = data.staffId;
      }

      // 8. Save the updated booking (for domain-level changes like time)
      const updatedBooking = await this.bookingRepository.update(booking, tx);
      
      // 9. Apply any direct database updates AFTER the domain update
      const hasDirectUpdates = Object.keys(directUpdates).length > 0;
      if (hasDirectUpdates) {
        console.log('[BookingUpdateService] Applying direct updates:', directUpdates);
        await tx.booking.update({
          where: {
            id: booking.id,
            merchantId: data.merchantId,
          },
          data: directUpdates,
        });
        
        // Reload the booking within the transaction to get all the updated data
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
        console.log('[BookingUpdateService] Reloaded booking after direct updates:', {
          bookingId: domainBooking.id,
          staffId: domainBooking.staffId,
          directUpdatesApplied: directUpdates,
        });
        return domainBooking;
      }
      
      return updatedBooking;
    }, {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  /**
   * Starts a booking (changes status to IN_PROGRESS)
   */
  async startBooking(bookingId: string, merchantId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId, merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    booking.start();
    return await this.bookingRepository.update(booking);
  }

  /**
   * Completes a booking (changes status to COMPLETED)
   */
  async completeBooking(bookingId: string, merchantId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId, merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    booking.complete();
    return await this.bookingRepository.update(booking);
  }

  /**
   * Cancels a booking with reason
   */
  async cancelBooking(data: CancelBookingData): Promise<Booking> {
    const booking = await this.bookingRepository.findById(data.bookingId, data.merchantId);
    if (!booking) {
      throw new NotFoundException(`Booking not found: ${data.bookingId}`);
    }

    booking.cancel(data.reason, data.cancelledBy);
    return await this.bookingRepository.update(booking);
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
}