/**
 * Optimized read model for calendar view
 * Minimal data for efficient calendar rendering
 */
export interface CalendarSlot {
  bookingId: string;
  bookingNumber: string;
  startTime: Date;
  endTime: Date;
  status: string;
  paymentStatus?: string;
  paidAmount?: number;
  completedAt?: Date | null;
  customerName: string;
  serviceName: string;
  serviceColor?: string;
  staffId: string;
  staffName: string;
  duration: number; // in minutes
}