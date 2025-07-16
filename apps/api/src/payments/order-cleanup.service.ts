import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderState } from '@heya-pos/types';

/**
 * Service to clean up abandoned draft orders
 */
@Injectable()
export class OrderCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderCleanupService.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Start the cleanup scheduler
    if (process.env.DISABLE_ORDER_CLEANUP !== 'true') {
      this.startCleanupScheduler();
      this.logger.log('Draft order cleanup scheduler started');
    } else {
      this.logger.log('Draft order cleanup disabled via environment variable');
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private startCleanupScheduler() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupDraftOrders().catch(error => {
        this.logger.error('Failed to cleanup draft orders', error);
      });
    }, 60 * 60 * 1000); // 1 hour

    // Run immediately on startup
    this.cleanupDraftOrders().catch(error => {
      this.logger.error('Failed to cleanup draft orders on startup', error);
    });
  }

  async cleanupDraftOrders(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Find draft orders older than 24 hours with no payments
      const abandonedOrders = await this.prisma.order.findMany({
        where: {
          state: OrderState.DRAFT,
          createdAt: {
            lt: twentyFourHoursAgo,
          },
          payments: {
            none: {}, // No payments exist
          },
        },
        select: {
          id: true,
          orderNumber: true,
          bookingId: true,
          createdAt: true,
        },
        take: 100, // Process in batches
      });

      this.logger.log(`Found ${abandonedOrders.length} abandoned draft orders to cleanup`);

      for (const order of abandonedOrders) {
        try {
          // Check if booking is in the future (don't delete draft orders for future bookings)
          if (order.bookingId) {
            const booking = await this.prisma.booking.findUnique({
              where: { id: order.bookingId },
              select: { startTime: true },
            });

            if (booking && booking.startTime > new Date()) {
              this.logger.log(`Skipping draft order ${order.orderNumber} - booking is in the future`);
              continue;
            }
          }

          // Update order state to CANCELLED instead of hard delete
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              state: OrderState.CANCELLED,
              cancelledAt: new Date(),
              notes: 'Auto-cancelled: Abandoned draft order',
            },
          });

          this.logger.log(`Cancelled abandoned draft order ${order.orderNumber}`);
        } catch (error) {
          this.logger.error(`Failed to cleanup order ${order.id}`, error);
        }
      }

      // Also cleanup orders marked as cancelled more than 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldCancelledCount = await this.prisma.order.count({
        where: {
          state: OrderState.CANCELLED,
          cancelledAt: {
            lt: thirtyDaysAgo,
          },
          payments: {
            none: {}, // Only delete if no payments
          },
        },
      });

      if (oldCancelledCount > 0) {
        this.logger.log(`Found ${oldCancelledCount} old cancelled orders eligible for deletion`);
        // For now, just log - we can enable hard deletion later if needed
      }
    } catch (error) {
      this.logger.error('Failed to cleanup draft orders', error);
    }
  }
}