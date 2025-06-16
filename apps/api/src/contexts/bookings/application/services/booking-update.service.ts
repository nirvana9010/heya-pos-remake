import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { Prisma } from '@prisma/client';

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
    return this.prisma.$transaction(async (tx) => {
      // 1. Get the existing booking
      const booking = await this.bookingRepository.findById(data.bookingId, data.merchantId);
      if (!booking) {
        throw new NotFoundException(`Booking not found: ${data.bookingId}`);
      }

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

      // 6. Update other fields
      if (data.notes !== undefined) {
        // For now, we'll need to add updateNotes method or handle this differently
        // Since the entity might not have this method yet
      }

      // 7. Save the updated booking
      return await this.bookingRepository.update(booking, tx);
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