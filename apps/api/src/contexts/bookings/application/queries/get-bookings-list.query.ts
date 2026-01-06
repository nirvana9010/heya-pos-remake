export interface BookingFilters {
  staffId?: string;
  customerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class GetBookingsListQuery {
  public readonly merchantId: string;
  public readonly filters: BookingFilters;
  public readonly pagination: {
    page: number;
    limit: number;
  };

  constructor(params: {
    merchantId: string;
    filters?: BookingFilters;
    pagination?: {
      page: number;
      limit: number;
    };
  }) {
    this.merchantId = params.merchantId;
    this.filters = params.filters || {};
    this.pagination = params.pagination || { page: 1, limit: 20 };
  }
}
