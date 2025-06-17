/**
 * Service summary for booking list display
 */
export interface BookingServiceSummary {
  id: string;
  name: string;
  duration: number;
  price: number;
}

/**
 * Optimized read model for booking list views
 * Contains only the data needed for list display
 */
export interface BookingListItem {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  staffId: string;  // Added for calendar display
  staffName: string;
  serviceName: string; // Deprecated - kept for backward compatibility
  services: BookingServiceSummary[]; // Array of services for multi-service bookings
  startTime: Date;
  endTime: Date;
  status: string;
  totalAmount: number;
  totalDuration: number; // Total duration in minutes
  locationName: string;
  createdAt: Date;
  isPaid?: boolean; // Payment status
  paidAmount?: number; // Amount paid
}