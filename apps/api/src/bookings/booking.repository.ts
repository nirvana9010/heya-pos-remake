import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

export interface CreateBookingWithLockDto {
  staffId: string;
  serviceId: string;
  customerId: string;
  startTime: Date;
  endTime: Date;
  locationId: string;
  merchantId: string;
  notes?: string;
  source: string;
  createdById: string;
  isOverride?: boolean;
  overrideReason?: string;
}

@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a booking with pessimistic locking to prevent double bookings.
   * This method encapsulates all the raw SQL and transaction logic.
   */
  async createWithLock(data: CreateBookingWithLockDto, tenantId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Lock the staff member to prevent concurrent bookings
      // This is the ONLY place in the codebase that should know about FOR UPDATE
      await tx.$queryRaw`
        SELECT 1 FROM "Staff" 
        WHERE "id" = ${data.staffId} 
        AND "merchantId" = ${tenantId}
        FOR UPDATE
      `;

      // Get service details for price and duration
      const service = await tx.service.findUnique({
        where: { id: data.serviceId },
      });

      if (!service) {
        throw new ConflictException('Service not found');
      }

      // 2. Check for conflicts (unless override is requested)
      if (!data.isOverride) {
        const conflicts = await tx.booking.findMany({
          where: {
            merchantId: tenantId,
            providerId: data.staffId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            OR: [
              {
                startTime: { gte: data.startTime, lt: data.endTime },
              },
              {
                endTime: { gt: data.startTime, lte: data.endTime },
              },
              {
                AND: [
                  { startTime: { lte: data.startTime } },
                  { endTime: { gte: data.endTime } },
                ],
              },
            ],
          },
          select: {
            id: true,
            bookingNumber: true,
            startTime: true,
            endTime: true,
          },
        });

        if (conflicts.length > 0) {
          throw new ConflictException({
            message: 'Time slot has conflicts',
            conflicts,
            requiresOverride: true,
          });
        }
      }

      // 3. Generate booking number
      const bookingCount = await tx.booking.count({
        where: { merchantId: tenantId },
      });
      const bookingNumber = this.generateBookingNumber(bookingCount + 1);

      // 4. Create the booking
      const booking = await tx.booking.create({
        data: {
          merchantId: tenantId,
          locationId: data.locationId,
          customerId: data.customerId,
          bookingNumber,
          status: 'CONFIRMED',
          startTime: data.startTime,
          endTime: data.endTime,
          totalAmount: service.price, // Set initial amount from service price
          source: data.source,
          createdById: data.createdById,
          providerId: data.staffId,
          notes: data.notes,
          isOverride: data.isOverride || false,
          overrideReason: data.overrideReason,
          overrideApprovedBy: data.isOverride ? data.createdById : null,
        },
        include: {
          services: true,
          customer: true,
          provider: true,
        },
      });

      // 5. Create the BookingService association
      await tx.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: data.serviceId,
          staffId: data.staffId,
          price: service.price,
          duration: service.duration,
        },
      });

      // 6. Fetch the complete booking with all associations
      const completeBooking = await tx.booking.findUnique({
        where: { id: booking.id },
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

      return completeBooking;
    }, {
      timeout: 10000, // 10 second timeout
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  /**
   * Find booking by ID with tenant isolation
   */
  async findById(bookingId: string, tenantId: string) {
    return this.prisma.booking.findUnique({
      where: { 
        id: bookingId,
        merchantId: tenantId,
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
  }

  /**
   * Find bookings with pagination and filters
   */
  async findMany(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      where?: Prisma.BookingWhereInput;
      orderBy?: Prisma.BookingOrderByWithRelationInput;
    }
  ) {
    const where = {
      ...options?.where,
      merchantId: tenantId,
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        ...options,
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
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings, total };
  }

  private generateBookingNumber(count: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `BK${timestamp}${random}`;
  }
}