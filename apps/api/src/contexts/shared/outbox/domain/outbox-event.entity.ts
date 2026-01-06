export interface OutboxEventData {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: any;
  eventVersion: number;
  merchantId: string;
}

export class OutboxEvent {
  constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly eventType: string,
    public readonly eventData: any,
    public readonly eventVersion: number,
    public readonly merchantId: string,
    public readonly createdAt: Date,
    public processedAt: Date | null = null,
    public retryCount: number = 0,
    public lastError: string | null = null,
  ) {}

  static create(data: OutboxEventData): OutboxEvent {
    const id = crypto.randomUUID();
    return new OutboxEvent(
      id,
      data.aggregateId,
      data.aggregateType,
      data.eventType,
      data.eventData,
      data.eventVersion,
      data.merchantId,
      new Date(),
    );
  }

  markAsProcessed(): void {
    this.processedAt = new Date();
  }

  recordError(error: string): void {
    this.retryCount++;
    this.lastError = error;
  }

  canRetry(maxRetries: number = 3): boolean {
    return this.retryCount < maxRetries && !this.processedAt;
  }
}
