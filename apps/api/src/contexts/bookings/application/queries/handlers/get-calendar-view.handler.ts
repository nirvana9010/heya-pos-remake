import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetCalendarViewQuery } from "../get-calendar-view.query";
import { CalendarSlot } from "../../read-models/calendar-slot.model";
import { PrismaService } from "../../../../../prisma/prisma.service";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { formatName } from "../../../../../utils/shared/format";

@QueryHandler(GetCalendarViewQuery)
export class GetCalendarViewHandler
  implements IQueryHandler<GetCalendarViewQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCalendarViewQuery): Promise<CalendarSlot[]> {
    const { merchantId, date, view, staffIds, locationId } = query;

    // Calculate date range based on view
    let startDate: Date;
    let endDate: Date;

    switch (view) {
      case "week":
        startDate = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        break;
      default: // day
        startDate = startOfDay(date);
        endDate = endOfDay(date);
        break;
    }

    // Build where clause
    const where: any = {
      merchantId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
    };

    if (staffIds && staffIds.length > 0) {
      where.providerId = {
        in: staffIds,
      };
    }

    if (locationId) {
      where.locationId = locationId;
    }

    // Fetch bookings with minimal fields for calendar
    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        bookingNumber: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        paidAmount: true,
        completedAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
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
                duration: true,
                categoryModel: {
                  select: {
                    color: true,
                  },
                },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Map to calendar slots
    return bookings.map((booking) => {
      const service = booking.services[0]?.service;
      const duration = Math.floor(
        (booking.endTime.getTime() - booking.startTime.getTime()) / 60000,
      );

      return {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paidAmount:
          typeof booking.paidAmount === "object" && booking.paidAmount.toNumber
            ? booking.paidAmount.toNumber()
            : Number(booking.paidAmount || 0),
        completedAt: booking.completedAt,
        customerName: formatName(
          booking.customer.firstName,
          booking.customer.lastName,
        ),
        serviceName: service?.name || "Unknown Service",
        serviceColor: service?.categoryModel?.color || "#6B7280",
        staffId: booking.provider?.id || null,
        staffName: booking.provider
          ? formatName(booking.provider.firstName, booking.provider.lastName)
          : "Unassigned",
        duration,
      };
    });
  }
}
