import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { BookingStatusValue } from '../../domain/value-objects/booking-status.vo';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

interface CreateBookingData {
  staffId: string;
  serviceId: string;
  customerId: string;
  startTime: Date;
  locationId: string;
  merchantId: string;
  notes?: string;
  source: string;
  createdById: string;
  isOverride?: boolean;
  overrideReason?: string;
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
  ) {}

  /**
   * Creates a booking with pessimistic locking to prevent double bookings.
   * This is a transactional script that orchestrates the entire booking creation process.
   */
  async createBooking(data: CreateBookingData): Promise<Booking> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the staff member to prevent concurrent bookings
      await this.bookingRepository.lockStaff(data.staffId, data.merchantId, tx);

      // 2. Fetch service details to calculate end time and pricing
      const service = await this.getServiceDetails(data.serviceId, tx);
      if (!service) {
        throw new Error(`Service not found: ${data.serviceId}`);
      }

      const endTime = new Date(data.startTime.getTime() + service.duration * 60 * 1000);

      // 3. Check for conflicting bookings
      const conflicts = await this.bookingRepository.findConflictingBookings(
        data.staffId,
        data.startTime,
        endTime,
        data.merchantId,
        undefined, // no booking to exclude since we're creating new
        tx
      );

      if (conflicts.length > 0 && !data.isOverride) {
        const conflictInfo = conflicts.map(c => ({
          id: c.id,
          startTime: c.timeSlot.start,
          endTime: c.timeSlot.end,
          status: c.status.value,
        }));
        throw new ConflictException({
          message: 'Time slot has conflicts',
          conflicts: conflictInfo,
        });
      }

      // 4. Generate booking number
      const bookingNumber = await this.generateBookingNumber(data.merchantId, tx);

      // 5. Create the booking domain entity
      const booking = new Booking({
        id: uuidv4(),
        bookingNumber,
        merchantId: data.merchantId,
        customerId: data.customerId,
        staffId: data.staffId,
        serviceId: data.serviceId,
        locationId: data.locationId,
        timeSlot: new TimeSlot(data.startTime, endTime),
        status: BookingStatusValue.CONFIRMED,
        totalAmount: service.price,
        depositAmount: 0, // TODO: Calculate based on merchant settings
        notes: data.notes,
        source: data.source,
        createdById: data.createdById,
        isOverride: data.isOverride || false,
        overrideReason: data.overrideReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 6. Persist the booking
      return await this.bookingRepository.save(booking, tx);
    }, {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
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
      price: service.price.toNumber(),
    };
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
}