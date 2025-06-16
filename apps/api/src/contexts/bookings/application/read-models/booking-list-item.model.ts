/**
 * Optimized read model for booking list views
 * Contains only the data needed for list display
 */
export interface BookingListItem {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  staffId: string;  // Added for calendar display
  staffName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  status: string;
  totalAmount: number;
  locationName: string;
  createdAt: Date;
}