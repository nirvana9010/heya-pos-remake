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
  customerName: string;
  serviceName: string;
  serviceColor?: string;
  staffId: string;
  staffName: string;
  duration: number; // in minutes
}