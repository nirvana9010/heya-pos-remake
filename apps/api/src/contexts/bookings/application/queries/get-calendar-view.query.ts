export class GetCalendarViewQuery {
  public readonly merchantId: string;
  public readonly date: Date;
  public readonly view: 'day' | 'week' | 'month';
  public readonly staffIds?: string[];
  public readonly locationId?: string;

  constructor(params: {
    merchantId: string;
    date: Date;
    view?: 'day' | 'week' | 'month';
    staffIds?: string[];
    locationId?: string;
  }) {
    this.merchantId = params.merchantId;
    this.date = params.date;
    this.view = params.view || 'day';
    this.staffIds = params.staffIds;
    this.locationId = params.locationId;
  }
}