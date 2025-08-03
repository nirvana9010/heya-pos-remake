import { Injectable } from '@nestjs/common';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BookingMapper } from './booking.mapper';
import { Prisma } from '@prisma/client';

/**
 * PrismaBookingRepository
 * Implements the domain repository interface using Prisma
 * Provides clean, composable methods for the transactional script pattern
 */
@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string, merchantId: string): Promise<Booking | null> {
    const prismaBooking = await this.prisma.booking.findFirst({
      where: {
        id,
        merchantId,
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

    if (!prismaBooking) {
      return null;
    }

    return BookingMapper.toDomain(prismaBooking);
  }

  async findMany(criteria: {
    merchantId: string;
    staffId?: string;
    customerId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: Booking[]; total: number }> {
    const where: any = {
      merchantId: criteria.merchantId,
    };

    if (criteria.staffId) {
      where.providerId = criteria.staffId;
    }

    if (criteria.customerId) {
      where.customerId = criteria.customerId;
    }

    if (criteria.status) {
      where.status = criteria.status;
    }

    if (criteria.startDate || criteria.endDate) {
      where.startTime = {};
      if (criteria.startDate) {
        where.startTime.gte = criteria.startDate;
      }
      if (criteria.endDate) {
        where.startTime.lte = criteria.endDate;
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
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
        skip: criteria.offset || 0,
        take: criteria.limit || 20,
        orderBy: {
          startTime: 'desc',
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map(BookingMapper.toDomain),
      total,
    };
  }

  /**
   * Lock a staff member for update to prevent concurrent bookings
   */
  async lockStaff(
    staffId: string,
    merchantId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT 1 FROM "Staff" 
      WHERE "id" = ${staffId} 
      AND "merchantId" = ${merchantId}
      FOR UPDATE
    `;
  }

  /**
   * Save a booking entity to the database
   */
  async save(
    booking: Booking,
    tx: Prisma.TransactionClient,
    services?: any[]
  ): Promise<Booking> {
    // Convert domain entity to persistence model
    const persistenceData = BookingMapper.toPersistence(booking);

    // Create the booking record
    const createdBooking = await tx.booking.create({
      data: {
        id: booking.id,
        merchantId: booking.merchantId,
        locationId: booking.locationId,
        customerId: booking.customerId,
        bookingNumber: booking.bookingNumber,
        status: booking.status.value,
        startTime: booking.timeSlot.start,
        endTime: booking.timeSlot.end,
        totalAmount: booking.totalAmount,
        depositAmount: booking.depositAmount,
        source: booking.source,
        createdById: booking.createdById,
        providerId: booking.staffId,
        notes: booking.notes,
        isOverride: booking.isOverride,
        overrideReason: booking.overrideReason,
        overrideApprovedBy: booking.isOverride ? booking.createdById : null,
      },
    });

    // Create BookingService associations
    if (services && services.length > 0) {
      // Create multiple booking services
      await tx.bookingService.createMany({
        data: services.map(service => ({
          bookingId: createdBooking.id,
          serviceId: service.id,
          staffId: service.staffId || booking.staffId,
          price: service.price,
          duration: service.duration,
        })),
      });
    } else if (booking.serviceId) {
      // Fallback to single service for backward compatibility (only if serviceId exists)
      await tx.bookingService.create({
        data: {
          bookingId: createdBooking.id,
          serviceId: booking.serviceId,
          staffId: booking.staffId,
          price: booking.totalAmount,
          duration: Math.floor(
            (booking.timeSlot.end.getTime() - booking.timeSlot.start.getTime()) / 60000
          ),
        },
      });
    }
    // For blank bookings (no serviceId), don't create any BookingService records

    // Fetch the complete booking with all associations
    const bookingWithRelations = await tx.booking.findUnique({
      where: { id: createdBooking.id },
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

    if (!bookingWithRelations) {
      throw new Error('Failed to fetch created booking');
    }

    return BookingMapper.toDomain(bookingWithRelations);
  }

  async update(
    booking: Booking,
    tx?: Prisma.TransactionClient
  ): Promise<Booking> {
    const db = tx || this.prisma;
    const updateData = BookingMapper.toPersistenceUpdate(booking);

    const updatedBooking = await db.booking.update({
      where: {
        id: booking.id,
        merchantId: booking.merchantId,
      },
      data: updateData,
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

    return BookingMapper.toDomain(updatedBooking);
  }

  async delete(id: string, merchantId: string): Promise<void> {
    // Soft delete - move to recycle bin
    await this.prisma.booking.update({
      where: {
        id,
        merchantId,
      },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        cancelledAt: new Date(),
        cancellationReason: 'Moved to recycle bin',
      },
    });
  }

  async isTimeSlotAvailable(
    staffId: string,
    startTime: Date,
    endTime: Date,
    merchantId: string,
    excludeBookingId?: string
  ): Promise<boolean> {
    const conflicts = await this.findConflictingBookings(
      staffId,
      startTime,
      endTime,
      merchantId,
      excludeBookingId
    );

    return conflicts.length === 0;
  }

  async findConflictingBookings(
    staffId: string,
    startTime: Date,
    endTime: Date,
    merchantId: string,
    excludeBookingId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<Booking[]> {
    const where: any = {
      merchantId,
      providerId: staffId,
      status: {
        notIn: ['CANCELLED', 'NO_SHOW', 'DELETED'],
      },
      OR: [
        {
          startTime: { gte: startTime, lt: endTime },
        },
        {
          endTime: { gt: startTime, lte: endTime },
        },
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gte: endTime } },
          ],
        },
      ],
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const db = tx || this.prisma;
    const conflicts = await db.booking.findMany({
      where,
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

    return conflicts.map(BookingMapper.toDomain);
  }
}