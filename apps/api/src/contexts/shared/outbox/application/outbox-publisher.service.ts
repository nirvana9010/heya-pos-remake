import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxEventRepository } from '../infrastructure/outbox-event.repository';
import { OutboxEvent } from '../domain/outbox-event.entity';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isPublishing = false;

  constructor(
    private readonly outboxRepository: OutboxEventRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Start polling for unprocessed events
    this.startPolling();
  }

  onModuleDestroy() {
    // Stop polling when module is destroyed
    this.stopPolling();
  }

  private startPolling() {
    // Poll every 5 seconds for faster booking visibility
    this.intervalId = setInterval(() => {
      this.publishUnprocessedEvents().catch(error => {
        this.logger.error('Error publishing outbox events', error);
      });
    }, 5000);

    // Also publish immediately on startup
    this.publishUnprocessedEvents().catch(error => {
      this.logger.error('Error publishing outbox events on startup', error);
    });
  }

  private stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async publishUnprocessedEvents(): Promise<void> {
    // Prevent concurrent publishing
    if (this.isPublishing) {
      return;
    }

    this.isPublishing = true;

    try {
      const events = await this.outboxRepository.findUnprocessed();
      
      if (events.length === 0) {
        return;
      }

      this.logger.log(`[${new Date().toISOString()}] Found ${events.length} unprocessed events`);

      for (const event of events) {
        try {
          this.logger.log(`[${new Date().toISOString()}] Publishing event ${event.id} of type ${event.aggregateType}.${event.eventType}`);
          
          // First try to mark as processed atomically
          // This prevents duplicate processing
          await this.outboxRepository.markAsProcessed(event.id);
          
          // Only publish if we successfully marked it as processed
          await this.publishEvent(event);
          
          this.logger.log(`[${new Date().toISOString()}] Successfully published and marked as processed: ${event.id}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Skip if event was already processed (race condition)
          if (errorMessage.includes('was already processed')) {
            this.logger.log(`[${new Date().toISOString()}] Event ${event.id} was already processed by another instance`);
            continue;
          }
          
          this.logger.error(`Failed to publish event ${event.id}: ${errorMessage}`);
          
          // Only record error if it's not an "already processed" error
          try {
            await this.outboxRepository.recordError(event.id, errorMessage);
          } catch (recordError) {
            this.logger.error(`Failed to record error for event ${event.id}:`, recordError);
          }
        }
      }
    } finally {
      this.isPublishing = false;
    }
  }

  private async publishEvent(event: OutboxEvent): Promise<void> {
    // Construct the full event name with context
    const eventName = `${event.aggregateType}.${event.eventType}`;
    
    this.logger.log(`[${new Date().toISOString()}] Publishing event ${eventName} with data:`, JSON.stringify({
      aggregateId: event.aggregateId,
      merchantId: event.merchantId,
      ...event.eventData,
    }, null, 2));
    
    // Emit the event with the original event data
    await this.eventEmitter.emitAsync(eventName, {
      aggregateId: event.aggregateId,
      merchantId: event.merchantId,
      ...event.eventData,
    });
  }
}