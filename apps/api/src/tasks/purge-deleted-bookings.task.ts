import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PurgeDeletedBookingsTask {
  private readonly logger = new Logger(PurgeDeletedBookingsTask.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run daily at 2 AM to purge bookings deleted more than 30 days ago
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeOldDeletedBookings() {
    this.logger.log("Starting purge of old deleted bookings...");

    try {
      // Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find and permanently delete bookings that were soft-deleted more than 30 days ago
      const result = await this.prisma.booking.deleteMany({
        where: {
          status: "DELETED",
          deletedAt: {
            lte: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`Purged ${result.count} old deleted bookings`);
    } catch (error) {
      this.logger.error("Failed to purge old deleted bookings", error);
    }
  }

  // Manual method to purge bookings for a specific merchant
  async purgeDeletedBookingsForMerchant(
    merchantId: string,
    daysOld: number = 30,
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.booking.deleteMany({
      where: {
        merchantId,
        status: "DELETED",
        deletedAt: {
          lte: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
