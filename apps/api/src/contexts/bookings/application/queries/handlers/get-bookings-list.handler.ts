import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBookingsListQuery } from '../get-bookings-list.query';
import { BookingListItem } from '../../read-models/booking-list-item.model';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CacheService } from '../../../../../common/cache/cache.service';

interface BookingsListResult {
  items: BookingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetBookingsListQuery)
export class GetBookingsListHandler implements IQueryHandler<GetBookingsListQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetBookingsListQuery): Promise<BookingsListResult> {
    const { merchantId, filters, pagination } = query;
    const page = Math.max(1, Number(pagination?.page) || 1);
    const limit = Math.max(1, Number(pagination?.limit) || 20);
    const offset = (page - 1) * limit;

    // Generate cache key
    const cacheKey = this.cacheService.generateKey(
      merchantId,
      'bookings-list',
      JSON.stringify(filters),
      page,
      limit,
    );

    // Try to get from cache first
    const cached = await this.cacheService.get<BookingsListResult>(cacheKey);
    if (cached) {
      return cached;
    }

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
                  id: true,
                  name: true,
                  duration: true,
                  price: true,
                  displayOrder: true,
                },
              },
            },
            orderBy: {
              service: {
                displayOrder: 'asc',
              },
            },
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

    // Map to read model with proper multi-service support
    const items: BookingListItem[] = bookings.map(booking => {
      const services = booking.services.map(s => ({
        id: s.service.id,
        name: s.service.name,
        duration: s.service.duration,
        price: typeof s.service.price === 'object' && s.service.price.toNumber
          ? s.service.price.toNumber()
          : Number(s.service.price),
      }));
      
      const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
      
      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
        customerPhone: booking.customer.phone,
        customerEmail: undefined, // Not included in list query for performance
        staffId: booking.provider.id,
        staffName: `${booking.provider.firstName} ${booking.provider.lastName}`,
        serviceName: services.length > 1 
          ? services.map(s => s.name).join(' + ')
          : services[0]?.name || 'Unknown Service',
        services,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        totalAmount: typeof booking.totalAmount === 'object' && booking.totalAmount.toNumber
          ? booking.totalAmount.toNumber()
          : Number(booking.totalAmount),
        totalDuration,
        locationName: booking.location.name,
        createdAt: booking.createdAt,
        isPaid: undefined, // Payment info not included in list query
        paidAmount: undefined,
      };
    });

    const result = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result for 1 minute
    await this.cacheService.set(cacheKey, result, 60000);

    return result;
  }
}