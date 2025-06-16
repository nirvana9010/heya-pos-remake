import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBookingsListQuery } from '../get-bookings-list.query';
import { BookingListItem } from '../../read-models/booking-list-item.model';
import { PrismaService } from '../../../../../prisma/prisma.service';

interface BookingsListResult {
  items: BookingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetBookingsListQuery)
export class GetBookingsListHandler implements IQueryHandler<GetBookingsListQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBookingsListQuery): Promise<BookingsListResult> {
    const { merchantId, filters, pagination } = query;
    const page = Math.max(1, Number(pagination?.page) || 1);
    const limit = Math.max(1, Number(pagination?.limit) || 20);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      merchantId,
    };

    if (filters.staffId) {
      where.providerId = filters.staffId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startTime.lte = filters.endDate;
      }
    }

    // Execute query with optimized fields for list view
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          startTime: true,
          endTime: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          services: {
            select: {
              service: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
          location: {
            select: {
              name: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: {
          startTime: 'desc',
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Map to read model
    const items: BookingListItem[] = bookings.map(booking => ({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      customerPhone: booking.customer.phone,
      staffId: booking.provider.id,  // ADD THIS - critical for calendar!
      staffName: `${booking.provider.firstName} ${booking.provider.lastName}`,
      serviceName: booking.services[0]?.service.name || 'Unknown Service',
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      totalAmount: booking.totalAmount.toNumber(),
      locationName: booking.location.name,
      createdAt: booking.createdAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}