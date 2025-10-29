import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetBookingsListQuery } from "../get-bookings-list.query";
import { BookingListItem } from "../../read-models/booking-list-item.model";
import { PrismaService } from "../../../../../prisma/prisma.service";
import { CacheService } from "../../../../../common/cache/cache.service";

interface BookingsListResult {
  items: BookingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetBookingsListQuery)
export class GetBookingsListHandler
  implements IQueryHandler<GetBookingsListQuery>
{
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
      "bookings-list",
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
          source: true,
          customerRequestedStaff: true,
          // Payment fields
          paymentStatus: true,
          paidAmount: true,
          paymentMethod: true,
          paidAt: true,
          completedAt: true,
          customerId: true,
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
                displayOrder: "asc",
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
          startTime: "desc",
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    // Load customer details separately to tolerate missing records
    const customerIds = Array.from(
      new Set(
        bookings
          .map((booking) => booking.customerId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            source: true,
          },
        })
      : [];

    const customerMap = new Map(
      customers.map((customer) => [customer.id, customer]),
    );

    // Map to read model with proper multi-service support
    const items: BookingListItem[] = bookings.map((booking) => {
      const customer = booking.customerId
        ? customerMap.get(booking.customerId)
        : undefined;
      const services = booking.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        duration: s.service.duration,
        price:
          typeof s.service.price === "object" && s.service.price.toNumber
            ? s.service.price.toNumber()
            : Number(s.service.price),
      }));

      const durationFromServices =
        services.length > 0
          ? services.reduce((sum, s) => sum + s.duration, 0)
          : 0;

      const durationFromTimestamps =
        booking.endTime && booking.startTime
          ? Math.max(
              0,
              Math.floor(
                (booking.endTime.getTime() - booking.startTime.getTime()) /
                  60000,
              ),
            )
          : 0;

      const totalDuration =
        durationFromTimestamps > 0
          ? durationFromTimestamps
          : durationFromServices > 0
            ? durationFromServices
            : 15; // Blank bookings have 15 minutes duration

      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        customerName: customer
          ? customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.firstName
          : "Unknown Customer",
        customerPhone: customer?.phone || undefined,
        customerEmail: undefined, // Not included in list query for performance
        customerSource: customer?.source || null,
        staffId: booking.provider?.id || null,
        staffName: booking.provider
          ? booking.provider.lastName
            ? `${booking.provider.firstName} ${booking.provider.lastName}`
            : booking.provider.firstName
          : "Unassigned",
        serviceName:
          services.length > 1
            ? services.map((s) => s.name).join(" + ")
            : services[0]?.name || "Service not selected",
        services,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        customerRequestedStaff: booking.customerRequestedStaff ?? false,
        totalAmount:
          typeof booking.totalAmount === "object" &&
          booking.totalAmount.toNumber
            ? booking.totalAmount.toNumber()
            : Number(booking.totalAmount),
        totalDuration,
        locationName: booking.location?.name || "No Location",
        createdAt: booking.createdAt,
        source: booking.source || null,
        // Payment fields
        paymentStatus: booking.paymentStatus || "UNPAID",
        isPaid: booking.paymentStatus === "PAID",
        paidAmount:
          typeof booking.paidAmount === "object" && booking.paidAmount.toNumber
            ? booking.paidAmount.toNumber()
            : Number(booking.paidAmount || 0),
        paymentMethod: booking.paymentMethod || undefined,
        paidAt: booking.paidAt || undefined,
        completedAt: booking.completedAt || undefined,
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
