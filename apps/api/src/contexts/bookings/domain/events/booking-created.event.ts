/**
 * BookingCreated Domain Event
 * Emitted when a new booking is successfully created
 */
export class BookingCreatedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly customerId: string,
    public readonly merchantId: string,
    public readonly staffId: string,
    public readonly serviceId: string,
    public readonly totalAmount: number,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly source: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}