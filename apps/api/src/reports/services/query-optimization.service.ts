import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { Prisma } from '@prisma/client';

interface RevenueData {
  total: number;
  serviceRevenue: number;
  productRevenue: number;
  byPaymentMethod: Record<string, number>;
}

@Injectable()
export class QueryOptimizationService {
  private readonly logger = new Logger(QueryOptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getOptimizedRevenue(
    merchantId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string,
  ): Promise<RevenueData> {
    const cacheKey = this.cacheService.generateKey(
      merchantId,
      'revenue',
      startDate.toISOString(),
      endDate.toISOString(),
      locationId || 'all',
    );

    // Check cache first
    const cached = await this.cacheService.get<RevenueData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use raw SQL for optimized aggregation
    const locationFilter = locationId ? Prisma.sql` AND o."locationId" = ${locationId}` : Prisma.sql``;
    
    const revenueQuery = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM(op."amount"), 0) as total,
        COALESCE(SUM(
          CASE 
            WHEN oi."itemType" = 'SERVICE' THEN oi."total"
            ELSE 0
          END
        ), 0) as service_revenue,
        COALESCE(SUM(
          CASE 
            WHEN oi."itemType" = 'PRODUCT' THEN oi."total"
            ELSE 0
          END
        ), 0) as product_revenue,
        op."paymentMethod",
        COALESCE(SUM(op."amount"), 0) as method_total
      FROM "Order" o
      LEFT JOIN "OrderPayment" op ON o."id" = op."orderId"
      LEFT JOIN "OrderItem" oi ON o."id" = oi."orderId"
      WHERE o."merchantId" = ${merchantId}
        AND o."state" = 'COMPLETED'
        AND o."completedAt" >= ${startDate}
        AND o."completedAt" <= ${endDate}
        AND op."status" = 'COMPLETED'
        ${locationFilter}
      GROUP BY op."paymentMethod"
    `;

    // Process results
    const byPaymentMethod: Record<string, number> = {};
    let total = 0;
    let serviceRevenue = 0;
    let productRevenue = 0;

    revenueQuery.forEach((row) => {
      const methodTotal = Number(row.method_total);
      total += methodTotal;
      serviceRevenue = Math.max(serviceRevenue, Number(row.service_revenue));
      productRevenue = Math.max(productRevenue, Number(row.product_revenue));
      
      if (row.paymentMethod) {
        byPaymentMethod[row.paymentMethod] = methodTotal;
      }
    });

    const result: RevenueData = {
      total,
      serviceRevenue,
      productRevenue,
      byPaymentMethod,
    };

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 600000);

    return result;
  }

  async getOptimizedBookingStats(
    merchantId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string,
  ) {
    const cacheKey = this.cacheService.generateKey(
      merchantId,
      'booking-stats',
      startDate.toISOString(),
      endDate.toISOString(),
      locationId || 'all',
    );

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const locationFilter = locationId ? Prisma.sql` AND "locationId" = ${locationId}` : Prisma.sql``;

    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_shows,
        AVG(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60)::numeric as avg_duration,
        COUNT(DISTINCT "customerId") as unique_customers
      FROM "Booking"
      WHERE "merchantId" = ${merchantId}
        AND "startTime" >= ${startDate}
        AND "startTime" <= ${endDate}
        ${locationFilter}
    `;

    const result = {
      total: Number(stats[0]?.total || 0),
      completed: Number(stats[0]?.completed || 0),
      cancelled: Number(stats[0]?.cancelled || 0),
      noShows: Number(stats[0]?.no_shows || 0),
      avgDuration: Number(stats[0]?.avg_duration || 0),
      uniqueCustomers: Number(stats[0]?.unique_customers || 0),
    };

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 600000);

    return result;
  }

  async getOptimizedStaffPerformance(
    merchantId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string,
  ) {
    const cacheKey = this.cacheService.generateKey(
      merchantId,
      'staff-performance',
      startDate.toISOString(),
      endDate.toISOString(),
      locationId || 'all',
    );

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const locationFilter = locationId ? Prisma.sql` AND b."locationId" = ${locationId}` : Prisma.sql``;

    const performance = await this.prisma.$queryRaw<any[]>`
      SELECT 
        s."id",
        s."firstName",
        s."lastName",
        COUNT(DISTINCT b."id") as total_bookings,
        COUNT(DISTINCT CASE WHEN b."status" = 'COMPLETED' THEN b."id" END) as completed_bookings,
        COALESCE(SUM(b."totalAmount"), 0) as total_revenue,
        COUNT(DISTINCT b."customerId") as unique_customers,
        AVG(EXTRACT(EPOCH FROM (b."endTime" - b."startTime")) / 60)::numeric as avg_booking_duration
      FROM "Staff" s
      LEFT JOIN "Booking" b ON s."id" = b."providerId"
        AND b."startTime" >= ${startDate}
        AND b."startTime" <= ${endDate}
        ${locationFilter}
      WHERE s."merchantId" = ${merchantId}
        AND s."status" = 'ACTIVE'
      GROUP BY s."id", s."firstName", s."lastName"
      ORDER BY total_revenue DESC
    `;

    const result = performance.map(row => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`,
      totalBookings: Number(row.total_bookings),
      completedBookings: Number(row.completed_bookings),
      totalRevenue: Number(row.total_revenue),
      uniqueCustomers: Number(row.unique_customers),
      avgBookingDuration: Number(row.avg_booking_duration),
    }));

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 600000);

    return result;
  }

  // Clear cache when data changes
  async invalidateReportsCache(merchantId: string) {
    await this.cacheService.deletePattern(`${merchantId}:revenue:.*`);
    await this.cacheService.deletePattern(`${merchantId}:booking-stats:.*`);
    await this.cacheService.deletePattern(`${merchantId}:staff-performance:.*`);
    this.logger.debug(`Invalidated reports cache for merchant ${merchantId}`);
  }
}