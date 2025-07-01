import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OutboxEvent } from '../domain/outbox-event.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class OutboxEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: OutboxEvent, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || this.prisma;
    
    await db.outboxEvent.create({
      data: {
        id: event.id,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        eventData: event.eventData,
        eventVersion: event.eventVersion,
        merchantId: event.merchantId,
        createdAt: event.createdAt,
        processedAt: event.processedAt,
        retryCount: event.retryCount,
        lastError: event.lastError,
      },
    });
  }

  async findUnprocessed(limit: number = 100): Promise<OutboxEvent[]> {
    // Simple approach: just find unprocessed events
    // The markAsProcessed method will handle atomicity
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: {
          lt: 3, // Max retries
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

    return events.map(this.toDomain);
  }

  async markAsProcessed(eventId: string): Promise<void> {
    // Use updateMany with a WHERE clause that ensures we only update if not already processed
    // This prevents duplicate processing in case of race conditions
    const result = await this.prisma.outboxEvent.updateMany({
      where: { 
        id: eventId,
        processedAt: null // Only update if not already processed
      },
      data: {
        processedAt: new Date(),
      },
    });

    // If no rows were updated, it means the event was already processed
    if (result.count === 0) {
      throw new Error(`Event ${eventId} was already processed`);
    }
  }

  async recordError(eventId: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        retryCount: {
          increment: 1,
        },
        lastError: error,
      },
    });
  }

  private toDomain(event: any): OutboxEvent {
    return new OutboxEvent(
      event.id,
      event.aggregateId,
      event.aggregateType,
      event.eventType,
      event.eventData,
      event.eventVersion,
      event.merchantId,
      event.createdAt,
      event.processedAt,
      event.retryCount,
      event.lastError,
    );
  }
}