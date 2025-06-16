export class CreateBookingCommand {
  constructor(
    public readonly data: {
      staffId: string;
      serviceId: string;
      customerId: string;
      startTime: Date;
      locationId: string;
      merchantId: string;
      notes?: string;
      source: string;
      createdById: string;
      isOverride?: boolean;
      overrideReason?: string;
    }
  ) {}
}