export interface BookingServiceData {
  serviceId: string;
  staffId?: string;
  price?: number;
  duration?: number;
}

export class CreateBookingCommand {
  constructor(
    public readonly data: {
      staffId?: string; // Optional, can be specified per service
      serviceId?: string; // Legacy single service support
      services?: BookingServiceData[]; // New multi-service support
      customerId: string;
      startTime: Date;
      locationId?: string;
      merchantId: string;
      notes?: string;
      source: string;
      createdById: string;
      customerRequestedStaff?: boolean;
      isOverride?: boolean;
      overrideReason?: string;
      orderId?: string; // Pre-created order ID to link
    }
  ) {
    // Validate that either serviceId or services is provided
    if (!data.serviceId && (!data.services || data.services.length === 0)) {
      throw new Error('Either serviceId or services array must be provided');
    }
  }
}
