export class GetBookingByIdQuery {
  public readonly bookingId: string;
  public readonly merchantId: string;

  constructor(params: { bookingId: string; merchantId: string }) {
    this.bookingId = params.bookingId;
    this.merchantId = params.merchantId;
  }
}
