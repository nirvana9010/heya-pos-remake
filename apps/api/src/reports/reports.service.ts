import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { toNumber, subtractDecimals, divideDecimals } from "../utils/decimal";
import { ReportOverview } from "./dto/report-overview.dto";
import { TimezoneService } from "../common/services/timezone.service";
import { DateTime } from "luxon";

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private timezoneService: TimezoneService,
  ) {}

  async getRevenueStats(merchantId: string, locationId?: string) {
    // Get merchant timezone
    const timezone = await this.getMerchantTimezone(merchantId, locationId);
    const now = new Date();

    // Use timezone-aware date calculations
    const todayStart = this.timezoneService.getStartOfDay(now, timezone);
    const todayEnd = this.timezoneService.getEndOfDay(now, timezone);

    // Use luxon for timezone-aware week/month/year calculations
    const dt = DateTime.now().setZone(timezone);
    const weekStart = dt.startOf("week").toJSDate();
    const weekEnd = dt.endOf("week").toJSDate();
    const monthStart = dt.startOf("month").toJSDate();
    const monthEnd = dt.endOf("month").toJSDate();
    const yearStart = dt.startOf("year").toJSDate();
    const yearEnd = dt.endOf("year").toJSDate();

    // Previous periods for comparison
    const lastWeekDt = dt.minus({ weeks: 1 });
    const lastWeekStart = lastWeekDt.startOf("week").toJSDate();
    const lastWeekEnd = lastWeekDt.endOf("week").toJSDate();
    const lastMonthDt = dt.minus({ months: 1 });
    const lastMonthStart = lastMonthDt.startOf("month").toJSDate();
    const lastMonthEnd = lastMonthDt.endOf("month").toJSDate();

    // Updated to use OrderPayment instead of Payment
    const baseWhere: any = {
      order: {
        merchantId,
        ...(locationId && { locationId }),
        state: { in: ["PAID", "COMPLETE"] },
      },
      status: "COMPLETED",
    };

    // Get revenue for different periods
    const [daily, weekly, monthly, yearly, lastWeekRevenue, lastMonthRevenue] =
      await Promise.all([
        // Today
        this.prisma.orderPayment.aggregate({
          where: {
            ...baseWhere,
            processedAt: { gte: todayStart, lte: todayEnd },
          },
          _sum: { amount: true },
        }),
        // This week
        this.prisma.orderPayment.aggregate({
          where: {
            ...baseWhere,
            processedAt: { gte: weekStart, lte: weekEnd },
          },
          _sum: { amount: true },
        }),
        // This month
        this.prisma.orderPayment.aggregate({
          where: {
            ...baseWhere,
            processedAt: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
        // This year
        this.prisma.orderPayment.aggregate({
          where: {
            ...baseWhere,
            processedAt: { gte: yearStart, lte: yearEnd },
          },
          _sum: { amount: true },
        }),
        // Last week (for comparison)
        this.prisma.orderPayment.aggregate({
          where: {
            ...baseWhere,
            processedAt: { gte: lastWeekStart, lte: lastWeekEnd },
          },
          _sum: { amount: true },
        }),
        // Last month (for comparison)
        this.prisma.orderPayment.aggregate({
          where: {
            ...baseWhere,
            processedAt: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          _sum: { amount: true },
        }),
      ]);

    // Calculate growth percentages
    const weeklyAmount = toNumber(weekly._sum.amount);
    const lastWeekAmount = toNumber(lastWeekRevenue._sum.amount);
    const monthlyAmount = toNumber(monthly._sum.amount);
    const lastMonthAmount = toNumber(lastMonthRevenue._sum.amount);

    const weeklyGrowth =
      lastWeekAmount > 0
        ? ((weeklyAmount - lastWeekAmount) / lastWeekAmount) * 100
        : 0;
    const monthlyGrowth =
      lastMonthAmount > 0
        ? ((monthlyAmount - lastMonthAmount) / lastMonthAmount) * 100
        : 0;

    return {
      revenue: {
        daily: toNumber(daily._sum.amount),
        weekly: weeklyAmount,
        monthly: monthlyAmount,
        yearly: toNumber(yearly._sum.amount),
      },
      growth: {
        weekly: Math.round(weeklyGrowth * 10) / 10,
        monthly: Math.round(monthlyGrowth * 10) / 10,
      },
    };
  }

  async getBookingStats(merchantId: string, locationId?: string) {
    // Get merchant timezone
    const timezone = await this.getMerchantTimezone(merchantId, locationId);
    const now = new Date();

    // Use timezone-aware date calculations
    const todayStart = this.timezoneService.getStartOfDay(now, timezone);
    const todayEnd = this.timezoneService.getEndOfDay(now, timezone);

    // Use luxon for timezone-aware week/month/year calculations
    const dt = DateTime.now().setZone(timezone);
    const weekStart = dt.startOf("week").toJSDate();
    const weekEnd = dt.endOf("week").toJSDate();
    const monthStart = dt.startOf("month").toJSDate();
    const monthEnd = dt.endOf("month").toJSDate();
    const yearStart = dt.startOf("year").toJSDate();
    const yearEnd = dt.endOf("year").toJSDate();

    const baseWhere = {
      merchantId,
      ...(locationId && { locationId }),
    };

    // Get bookings for different time periods (based on startTime for actual appointments)
    const [
      daily,
      weekly,
      monthly,
      yearly,
      dailyCompleted,
      weeklyCompleted,
      monthlyCompleted,
    ] = await Promise.all([
      // Today's bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          startTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      // This week's bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          startTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      // This month's bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
      // This year's bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          startTime: { gte: yearStart, lte: yearEnd },
        },
      }),
      // Today's completed bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: "COMPLETED",
          startTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      // This week's completed bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: "COMPLETED",
          startTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      // This month's completed bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: "COMPLETED",
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    // Get status breakdown for the current month (for backwards compatibility)
    const [cancelled, noShow, pending] = await Promise.all([
      // Cancelled bookings this month
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: "CANCELLED",
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
      // No-show bookings this month
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: "NO_SHOW",
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
      // Pending bookings (future)
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { gte: now },
        },
      }),
    ]);

    // Calculate total for all time (for backward compatibility)
    const total = await this.prisma.booking.count({
      where: baseWhere,
    });

    return {
      bookings: {
        // Time-based breakdowns (new)
        daily,
        weekly,
        monthly,
        yearly,
        // Status breakdowns
        total,
        completed: monthlyCompleted, // For backward compatibility
        dailyCompleted,
        weeklyCompleted,
        monthlyCompleted,
        cancelled,
        noShow,
        pending,
      },
    };
  }

  async getCustomerStats(merchantId: string) {
    const timezone = await this.getMerchantTimezone(merchantId);
    const dt = DateTime.now().setZone(timezone);

    const monthStart = dt.startOf("month").toJSDate();
    const monthEnd = dt.endOf("month").toJSDate();
    const lastMonthDt = dt.minus({ months: 1 });
    const lastMonthStart = lastMonthDt.startOf("month").toJSDate();
    const lastMonthEnd = lastMonthDt.endOf("month").toJSDate();

    const [total, newThisMonth, newLastMonth, withLoyalty] = await Promise.all([
      // Total customers
      this.prisma.customer.count({
        where: { merchantId, status: "ACTIVE" },
      }),
      // New this month
      this.prisma.customer.count({
        where: {
          merchantId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // New last month (for comparison)
      this.prisma.customer.count({
        where: {
          merchantId,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      // Loyalty members
      this.prisma.customer.count({
        where: {
          merchantId,
          loyaltyCards: { some: { status: "ACTIVE" } },
        },
      }),
    ]);

    // Calculate returning customers (customers with more than 1 booking)
    const returning = await this.prisma.customer.count({
      where: {
        merchantId,
        bookings: {
          some: {
            status: "COMPLETED",
          },
        },
      },
    });

    const growth =
      newLastMonth > 0
        ? ((newThisMonth - newLastMonth) / newLastMonth) * 100
        : 0;

    return {
      customers: {
        total,
        new: newThisMonth,
        returning,
        loyaltyMembers: withLoyalty,
      },
      growth: Math.round(growth * 10) / 10,
    };
  }

  async getTopServices(merchantId: string, limit = 10) {
    const timezone = await this.getMerchantTimezone(merchantId);
    const dt = DateTime.now().setZone(timezone);
    const monthStart = dt.startOf("month").toJSDate();
    const monthEnd = dt.endOf("month").toJSDate();

    const topServices = await this.prisma.bookingService.groupBy({
      by: ["serviceId"],
      where: {
        booking: {
          merchantId,
          status: "COMPLETED",
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      },
      _count: true,
      _sum: {
        price: true,
      },
      orderBy: {
        _count: {
          serviceId: "desc",
        },
      },
      take: limit,
    });

    // Get service details
    const serviceIds = topServices.map((s) => s.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    const serviceMap = services.reduce(
      (acc, s) => {
        acc[s.id] = s.name;
        return acc;
      },
      {} as Record<string, string>,
    );

    return topServices.map((item) => ({
      serviceId: item.serviceId,
      name: serviceMap[item.serviceId] || "Unknown Service",
      bookings: item._count,
      revenue: toNumber(item._sum.price),
    }));
  }

  async getStaffPerformance(merchantId: string, limit = 10) {
    const timezone = await this.getMerchantTimezone(merchantId);
    const dt = DateTime.now().setZone(timezone);
    const monthStart = dt.startOf("month").toJSDate();
    const monthEnd = dt.endOf("month").toJSDate();

    const staffPerformance = await this.prisma.booking.groupBy({
      by: ["providerId"],
      where: {
        merchantId,
        status: "COMPLETED",
        completedAt: { gte: monthStart, lte: monthEnd },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: limit,
    });

    // Get staff details
    const staffIds = staffPerformance.map((s) => s.providerId);
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const staffMap = staff.reduce(
      (acc, s) => {
        acc[s.id] = s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Calculate utilization (simplified - would need working hours in production)
    const hoursInMonth = 160; // Assuming 40 hours/week * 4 weeks

    return staffPerformance.map((item) => ({
      staffId: item.providerId,
      name: staffMap[item.providerId] || "Unknown Staff",
      bookings: item._count,
      revenue: toNumber(item._sum.totalAmount),
      utilization: Math.min(
        100,
        Math.round(((item._count * 1.5) / hoursInMonth) * 100),
      ), // Assuming 1.5 hours per booking average
    }));
  }

  async getDailyRevenue(merchantId: string, days = 30) {
    const timezone = await this.getMerchantTimezone(merchantId);
    const endDate = this.timezoneService.getEndOfDay(new Date(), timezone);
    const startDate = this.timezoneService.getStartOfDay(
      subDays(new Date(), days - 1),
      timezone,
    );

    const payments = await this.prisma.orderPayment.findMany({
      where: {
        order: {
          merchantId,
          state: { in: ["PAID", "COMPLETE"] },
        },
        status: "COMPLETED",
        processedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        processedAt: true,
      },
      orderBy: {
        processedAt: "asc",
      },
    });

    // Group by day in merchant timezone
    const revenueByDay: Record<string, number> = {};

    payments.forEach((payment) => {
      // Get the date in merchant timezone as YYYY-MM-DD string
      const dt = DateTime.fromJSDate(payment.processedAt!).setZone(timezone);
      const dayKey = dt.toFormat("yyyy-MM-dd");
      revenueByDay[dayKey] =
        (revenueByDay[dayKey] || 0) + toNumber(payment.amount);
    });

    // Fill in missing days with 0
    const result = [];
    const nowInTimezone = DateTime.now().setZone(timezone);

    for (let i = 0; i < days; i++) {
      const date = nowInTimezone.minus({ days: days - 1 - i });
      const dayKey = date.toFormat("yyyy-MM-dd");
      result.push({
        date: dayKey, // Return as YYYY-MM-DD format, not ISO with time
        revenue: revenueByDay[dayKey] || 0,
      });
    }

    return result;
  }

  async getDailySummary(merchantId: string, date?: string, locationId?: string) {
    const timezone = await this.getMerchantTimezone(merchantId, locationId);
    const targetDate: Date | string = date || new Date();
    const dayStart = this.timezoneService.getStartOfDay(targetDate, timezone);
    const dayEnd = this.timezoneService.getEndOfDay(targetDate, timezone);

    const [revenueByMethod, bookingCounts, staffPerformance] = await Promise.all([
      this.getDailyRevenueByMethod(merchantId, dayStart, dayEnd, locationId),
      this.prisma.booking.groupBy({
        by: ["status"],
        where: {
          merchantId,
          ...(locationId && { locationId }),
          startTime: { gte: dayStart, lte: dayEnd },
        },
        _count: true,
      }),
      this.getDailyStaffPerformance(merchantId, dayStart, dayEnd, locationId, 5),
    ]);

    const total = bookingCounts.reduce((s, b) => s + b._count, 0);
    const completed = bookingCounts.find((b) => b.status === "COMPLETED")?._count || 0;

    return {
      revenueByMethod,
      bookings: { total, completed },
      staffPerformance,
    };
  }

  private async getDailyStaffPerformance(
    merchantId: string,
    dayStart: Date,
    dayEnd: Date,
    locationId?: string,
    limit = 10,
  ) {
    const staffPerformance = await this.prisma.booking.groupBy({
      by: ["providerId"],
      where: {
        merchantId,
        ...(locationId && { locationId }),
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: "DELETED" },
        providerId: { not: null },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: limit,
    });

    if (!staffPerformance.length) {
      return [];
    }

    const staffIds = staffPerformance
      .map((item) => item.providerId)
      .filter((id): id is string => Boolean(id));
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const staffMap = staff.reduce(
      (acc, s) => {
        acc[s.id] = s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
        return acc;
      },
      {} as Record<string, string>,
    );

    const hoursInDay = 8;
    return staffPerformance.map((item) => {
      const staffId = item.providerId as string;
      const bookingsCount = item._count;
      return {
        staffId,
        name: staffMap[staffId] || "Unknown Staff",
        bookings: bookingsCount,
        // Includes all scheduled-booking revenue for the day, including incomplete.
        revenue: toNumber(item._sum.totalAmount),
        utilization: Math.min(
          100,
          Math.round(((bookingsCount * 1.5) / hoursInDay) * 100),
        ),
      };
    });
  }

  private async getDailyRevenueByMethod(
    merchantId: string,
    dayStart: Date,
    dayEnd: Date,
    locationId?: string,
  ) {
    // Get completed payments for bookings scheduled on the selected day.
    // This keeps the breakdown aligned to booking day (not payment processing day).
    const payments = await this.prisma.orderPayment.findMany({
      where: {
        order: {
          merchantId,
          ...(locationId && { locationId }),
          booking: {
            startTime: { gte: dayStart, lte: dayEnd },
          },
        },
        status: "COMPLETED",
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    let cash = 0;
    let card = 0;
    let deposits = 0;

    for (const p of payments) {
      const amt = toNumber(p.amount);
      const method = (p.paymentMethod || "").toUpperCase();
      if (method === "CASH") {
        cash += amt;
      } else if (method === "CARD" || method === "EFTPOS") {
        card += amt;
      } else {
        // GIFT_CARD, LOYALTY_POINTS, STORE_CREDIT, ONLINE, etc.
        deposits += amt;
      }
    }

    // Include all non-deleted bookings in the day's total split.
    const dayBookings = await this.prisma.booking.findMany({
      where: {
        merchantId,
        ...(locationId && { locationId }),
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: {
        status: true,
        totalAmount: true,
      },
    });

    let completedValue = 0;
    let incomplete = 0;

    for (const booking of dayBookings) {
      const status = (booking.status || "").toUpperCase();
      const amount = toNumber(booking.totalAmount);

      if (status === "DELETED") continue;
      if (status === "COMPLETED") {
        completedValue += amount;
      } else {
        incomplete += amount;
      }
    }

    const totalPaid = cash + card + deposits;
    const unpaid = Math.max(0, completedValue - totalPaid);

    return { cash, card, deposits, unpaid, incomplete };
  }

  async getCleanReportOverview(
    merchantId: string,
    locationId?: string,
  ): Promise<ReportOverview> {
    // Get merchant timezone first
    const timezone = await this.getMerchantTimezone(merchantId, locationId);
    const now = new Date();

    // Use timezone-aware date calculations
    const todayStart = this.timezoneService.getStartOfDay(now, timezone);
    const yesterdayStart = this.timezoneService.getStartOfDay(
      subDays(now, 1),
      timezone,
    );

    const dt = DateTime.now().setZone(timezone);
    const weekStart = dt.startOf("week").toJSDate();
    const lastWeekDt = dt.minus({ weeks: 1 });
    const lastWeekStart = lastWeekDt.startOf("week").toJSDate();
    const monthStart = dt.startOf("month").toJSDate();
    const lastMonthDt = dt.minus({ months: 1 });
    const lastMonthStart = lastMonthDt.startOf("month").toJSDate();

    // Get all data in parallel
    const [
      revenueData,
      bookingData,
      customerData,
      topServices,
      staffPerformance,
      revenueTrend,
      bookingTrend,
      revenueByMethod,
    ] = await Promise.all([
      this.getRevenueStats(merchantId, locationId),
      this.getBookingStats(merchantId, locationId),
      this.getCustomerStats(merchantId),
      this.getTopServices(merchantId, 5),
      this.getStaffPerformance(merchantId, 5),
      this.getDailyRevenue(merchantId, 30),
      this.getBookingTrend(merchantId, 30),
      this.getDailyRevenueByMethod(
        merchantId,
        this.timezoneService.getStartOfDay(now, timezone),
        this.timezoneService.getEndOfDay(now, timezone),
        locationId,
      ),
    ]);

    // Calculate daily growth
    const [todayRevenue, yesterdayRevenue] = await Promise.all([
      this.prisma.orderPayment.aggregate({
        where: {
          order: { merchantId, ...(locationId && { locationId }) },
          status: "COMPLETED",
          processedAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.orderPayment.aggregate({
        where: {
          order: { merchantId, ...(locationId && { locationId }) },
          status: "COMPLETED",
          processedAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const todayAmount = toNumber(todayRevenue._sum.amount);
    const yesterdayAmount = toNumber(yesterdayRevenue._sum.amount);
    const dailyGrowth =
      yesterdayAmount > 0
        ? ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100
        : 0;

    // Calculate booking growth
    const [currentBookings, lastMonthBookings] = await Promise.all([
      this.prisma.booking.count({
        where: {
          merchantId,
          ...(locationId && { locationId }),
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.booking.count({
        where: {
          merchantId,
          ...(locationId && { locationId }),
          createdAt: { gte: lastMonthStart, lt: monthStart },
        },
      }),
    ]);

    const bookingGrowthRate =
      lastMonthBookings > 0
        ? ((currentBookings - lastMonthBookings) / lastMonthBookings) * 100
        : 0;

    // Calculate average booking value (for current month)
    const monthlyRevenue = revenueData.revenue.monthly;
    const monthlyBookings = bookingData.bookings.completed || 1;
    const avgBookingValue = monthlyRevenue / monthlyBookings;

    // Calculate customer retention rate
    const returningCustomers = customerData.customers.returning;
    const totalCustomers = customerData.customers.total || 1;
    const retentionRate = (returningCustomers / totalCustomers) * 100;

    // Get business hours for the location
    let businessHours = null;
    let activeStaffCount = 0;

    try {
      // Get the location to fetch business hours
      const location = await this.prisma.location.findFirst({
        where: {
          merchantId,
          ...(locationId && { id: locationId }),
          isActive: true,
        },
        select: {
          businessHours: true,
        },
      });

      if (location?.businessHours) {
        businessHours = location.businessHours;
      }

      // Get count of active staff working today
      activeStaffCount = await this.prisma.staff.count({
        where: {
          merchantId,
          status: "ACTIVE",
        },
      });
    } catch (error: any) {
      console.log(
        "Could not fetch business hours or staff count:",
        error.message,
      );
    }

    // Calculate average service duration from actual bookings (if available)
    let avgServiceDuration = 60; // Default to 60 minutes

    try {
      const avgDuration = await this.prisma.bookingService.aggregate({
        where: {
          booking: {
            merchantId,
            ...(locationId && { locationId }),
            status: "COMPLETED",
            completedAt: { gte: monthStart },
          },
        },
        _avg: {
          duration: true,
        },
      });

      if (avgDuration._avg.duration) {
        avgServiceDuration = Math.round(avgDuration._avg.duration);
      }
    } catch (error: any) {
      console.log(
        "Could not calculate average service duration:",
        error.message,
      );
    }

    // Return clean, flat structure
    return {
      revenue: revenueData.revenue,
      revenueByMethod,
      revenueGrowth: {
        daily: Math.round(dailyGrowth * 10) / 10,
        weekly: revenueData.growth.weekly,
        monthly: revenueData.growth.monthly,
      },
      bookings: bookingData.bookings,
      bookingGrowth: {
        daily: 0, // Could calculate if needed
        weekly: 0, // Could calculate if needed
        monthly: Math.round(bookingGrowthRate * 10) / 10,
      },
      customers: customerData.customers,
      customerGrowth: customerData.growth,
      topServices,
      staffPerformance,
      revenueTrend: revenueTrend.map((item) => ({
        date: item.date,
        value: item.revenue,
      })),
      bookingTrend: bookingTrend || [],
      avgBookingValue: Math.round(avgBookingValue * 100) / 100,
      avgServiceDuration,
      customerRetentionRate: Math.round(retentionRate * 10) / 10,
      businessHours,
      activeStaffCount,
    };
  }

  async getBookingTrend(merchantId: string, days = 30) {
    const timezone = await this.getMerchantTimezone(merchantId);
    const nowInTimezone = DateTime.now().setZone(timezone);
    const endDate = nowInTimezone.endOf("day").toJSDate();
    const startDate = nowInTimezone
      .minus({ days: days - 1 })
      .startOf("day")
      .toJSDate();

    const bookings = await this.prisma.booking.findMany({
      where: {
        merchantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by day in merchant timezone
    const bookingsByDay: Record<string, number> = {};

    bookings.forEach((booking) => {
      // Get the date in merchant timezone as YYYY-MM-DD string
      const dt = DateTime.fromJSDate(booking.createdAt).setZone(timezone);
      const dayKey = dt.toFormat("yyyy-MM-dd");
      bookingsByDay[dayKey] = (bookingsByDay[dayKey] || 0) + 1;
    });

    // Fill in missing days with 0
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = nowInTimezone.minus({ days: days - 1 - i });
      const dayKey = date.toFormat("yyyy-MM-dd");
      result.push({
        date: dayKey, // Return as YYYY-MM-DD format, not ISO with time
        value: bookingsByDay[dayKey] || 0,
      });
    }

    return result;
  }

  async getActivityLog(
    merchantId: string,
    params: {
      page?: number;
      limit?: number;
      staffId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = { merchantId };

    if (params.staffId) {
      where.staffId = params.staffId;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        // End of day for endDate
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: {
          staff: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((entry) => ({
        id: entry.id,
        action: entry.action,
        staffFirstName: entry.staff.firstName,
        staffLastName: entry.staff.lastName,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        timestamp: entry.timestamp.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the merchant's timezone from their primary location
   */
  private async getMerchantTimezone(
    merchantId: string,
    locationId?: string,
  ): Promise<string> {
    if (locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: locationId, merchantId },
        select: { timezone: true },
      });
      if (location) return location.timezone;
    }

    // Get the primary location's timezone
    const primaryLocation = await this.prisma.location.findFirst({
      where: { merchantId, isActive: true },
      select: { timezone: true },
      orderBy: { createdAt: "asc" }, // Get the first created location as primary
    });

    return primaryLocation?.timezone || "Australia/Sydney"; // Default fallback
  }
}
