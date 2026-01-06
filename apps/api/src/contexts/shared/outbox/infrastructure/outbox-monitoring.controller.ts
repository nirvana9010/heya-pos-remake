import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../../auth/guards/jwt-auth.guard";
import { Permissions } from "../../../../auth/decorators/permissions.decorator";
import { PrismaService } from "../../../../prisma/prisma.service";

@Controller("admin/outbox")
@UseGuards(JwtAuthGuard)
export class OutboxMonitoringController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("status")
  @Permissions("admin")
  async getOutboxStatus() {
    const [total, unprocessed, processed, failed] = await Promise.all([
      this.prisma.outboxEvent.count(),
      this.prisma.outboxEvent.count({
        where: { processedAt: null, retryCount: { lt: 3 } },
      }),
      this.prisma.outboxEvent.count({ where: { processedAt: { not: null } } }),
      this.prisma.outboxEvent.count({ where: { retryCount: { gte: 3 } } }),
    ]);

    const recentEvents = await this.prisma.outboxEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        aggregateType: true,
        eventType: true,
        createdAt: true,
        processedAt: true,
        retryCount: true,
        lastError: true,
      },
    });

    return {
      summary: {
        total,
        unprocessed,
        processed,
        failed,
      },
      recentEvents,
    };
  }

  @Get("unprocessed")
  @Permissions("admin")
  async getUnprocessedEvents() {
    return this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: { lt: 3 },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  }
}
