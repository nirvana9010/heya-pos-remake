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
  customerSource?: string | null;
  staffId: string; // Added for calendar display
  staffName: string;
  serviceName: string; // Deprecated - kept for backward compatibility
  services: BookingServiceSummary[]; // Array of services for multi-service bookings
  startTime: Date;
  endTime: Date;
  status: string;
  customerRequestedStaff: boolean;
  totalAmount: number;
  totalDuration: number; // Total duration in minutes
  locationName: string;
  createdAt: Date;
  source?: string | null;
  // Payment fields - using new simplified architecture
  paymentStatus: string; // UNPAID, PARTIAL, PAID, REFUNDED
  isPaid?: boolean; // Kept for backward compatibility (true if paymentStatus === 'PAID')
  paidAmount?: number; // Amount paid
  paymentMethod?: string;
  paidAt?: Date;
  completedAt?: Date;
}
