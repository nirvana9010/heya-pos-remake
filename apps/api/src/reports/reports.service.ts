import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
} from 'date-fns';
import { toNumber, subtractDecimals, divideDecimals } from '../utils/decimal';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getRevenueStats(merchantId: string, locationId?: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    // Previous periods for comparison
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const baseWhere: any = {
      invoice: {
        merchantId,
        ...(locationId && { booking: { locationId } }),
        status: 'PAID',
      },
      status: 'COMPLETED',
    };

    // Get revenue for different periods
    const [daily, weekly, monthly, yearly, lastWeek, lastMonth] = await Promise.all([
      // Today
      this.prisma.payment.aggregate({
        where: {
          ...baseWhere,
          processedAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      // This week
      this.prisma.payment.aggregate({
        where: {
          ...baseWhere,
          processedAt: { gte: weekStart, lte: weekEnd },
        },
        _sum: { amount: true },
      }),
      // This month
      this.prisma.payment.aggregate({
        where: {
          ...baseWhere,
          processedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      // This year
      this.prisma.payment.aggregate({
        where: {
          ...baseWhere,
          processedAt: { gte: yearStart, lte: yearEnd },
        },
        _sum: { amount: true },
      }),
      // Last week (for comparison)
      this.prisma.payment.aggregate({
        where: {
          ...baseWhere,
          processedAt: { gte: lastWeekStart, lte: lastWeekEnd },
        },
        _sum: { amount: true },
      }),
      // Last month (for comparison)
      this.prisma.payment.aggregate({
        where: {
          ...baseWhere,
          processedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    // Calculate growth percentages
    const weeklyAmount = toNumber(weekly._sum.amount);
    const lastWeekAmount = toNumber(lastWeek._sum.amount);
    const monthlyAmount = toNumber(monthly._sum.amount);
    const lastMonthAmount = toNumber(lastMonth._sum.amount);
    
    const weeklyGrowth = lastWeekAmount > 0
      ? ((weeklyAmount - lastWeekAmount) / lastWeekAmount) * 100
      : 0;
    const monthlyGrowth = lastMonthAmount > 0
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
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const baseWhere = {
      merchantId,
      ...(locationId && { locationId }),
    };

    const [total, completed, cancelled, noShow, pending] = await Promise.all([
      // Total bookings this month
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // Completed bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // Cancelled bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'CANCELLED',
          cancelledAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // No-show bookings
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: 'NO_SHOW',
          updatedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // Pending bookings (future)
      this.prisma.booking.count({
        where: {
          ...baseWhere,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startTime: { gte: now },
        },
      }),
    ]);

    return {
      bookings: {
        total,
        completed,
        cancelled,
        noShow,
        pending,
      },
    };
  }

  async getCustomerStats(merchantId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const [total, newThisMonth, newLastMonth, withLoyalty] = await Promise.all([
      // Total customers
      this.prisma.customer.count({
        where: { merchantId, status: 'ACTIVE' },
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
          loyaltyCards: { some: { status: 'ACTIVE' } },
        },
      }),
    ]);

    // Calculate returning customers (customers with more than 1 booking)
    const returning = await this.prisma.customer.count({
      where: {
        merchantId,
        bookings: {
          some: {
            status: 'COMPLETED',
          },
        },
      },
    });

    const growth = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

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
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const topServices = await this.prisma.bookingService.groupBy({
      by: ['serviceId'],
      where: {
        booking: {
          merchantId,
          status: 'COMPLETED',
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      },
      _count: true,
      _sum: {
        price: true,
      },
      orderBy: {
        _count: {
          serviceId: 'desc',
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
      {} as Record<string, string>
    );

    return topServices.map((item) => ({
      serviceId: item.serviceId,
      name: serviceMap[item.serviceId] || 'Unknown Service',
      bookings: item._count,
      revenue: toNumber(item._sum.price),
    }));
  }

  async getStaffPerformance(merchantId: string, limit = 10) {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const staffPerformance = await this.prisma.booking.groupBy({
      by: ['providerId'],
      where: {
        merchantId,
        status: 'COMPLETED',
        completedAt: { gte: monthStart, lte: monthEnd },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
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
        acc[s.id] = `${s.firstName} ${s.lastName}`;
        return acc;
      },
      {} as Record<string, string>
    );

    // Calculate utilization (simplified - would need working hours in production)
    const hoursInMonth = 160; // Assuming 40 hours/week * 4 weeks

    return staffPerformance.map((item) => ({
      staffId: item.providerId,
      name: staffMap[item.providerId] || 'Unknown Staff',
      bookings: item._count,
      revenue: toNumber(item._sum.totalAmount),
      utilization: Math.min(100, Math.round(((item._count * 1.5) / hoursInMonth) * 100)), // Assuming 1.5 hours per booking average
    }));
  }

  async getDailyRevenue(merchantId: string, days = 30) {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          merchantId,
          status: 'PAID',
        },
        status: 'COMPLETED',
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
        processedAt: 'asc',
      },
    });

    // Group by day
    const revenueByDay: Record<string, number> = {};

    payments.forEach((payment) => {
      const day = startOfDay(payment.processedAt!).toISOString();
      revenueByDay[day] = (revenueByDay[day] || 0) + toNumber(payment.amount);
    });

    // Fill in missing days with 0
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      const dayKey = startOfDay(date).toISOString();
      result.push({
        date: dayKey,
        revenue: revenueByDay[dayKey] || 0,
      });
    }

    return result;
  }
}
