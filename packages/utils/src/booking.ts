import type { Booking, BookingItem, Service } from '@heya-pos/types';
import { addMinutes } from 'date-fns';

export function calculateBookingDuration(items: BookingItem[]): number {
  return items.reduce((total, item) => total + (item.duration || 0), 0);
}

export function calculateBookingEndTime(startTime: Date, items: BookingItem[]): Date {
  const duration = calculateBookingDuration(items);
  return addMinutes(startTime, duration);
}

export function calculateBookingTotal(items: BookingItem[]): number {
  return items.reduce((total, item) => {
    const itemTotal = (item.price * item.quantity) - item.discount + item.taxAmount;
    return total + itemTotal;
  }, 0);
}

export function createBookingItems(
  services: Service[],
  quantities: Record<string, number> = {}
): Partial<BookingItem>[] {
  return services.map(service => ({
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    quantity: quantities[service.id] || 1,
    discount: 0,
    taxAmount: service.price * service.taxRate,
    total: service.price * (quantities[service.id] || 1) * (1 + service.taxRate),
    duration: service.duration,
  }));
}

export function getBookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'yellow',
    CONFIRMED: 'blue',
    CHECKED_IN: 'green',
    IN_PROGRESS: 'purple',
    COMPLETED: 'gray',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
  };
  
  return colors[status] || 'gray';
}

export function canCancelBooking(booking: Booking, cancellationHours: number = 24): boolean {
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(booking.status)) {
    return false;
  }

  if (cancellationHours === 0) {
    return true;
  }

  const now = new Date();
  const hoursUntilStart = (new Date(booking.startTime).getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilStart >= cancellationHours;
}

export function canModifyBooking(booking: Booking): boolean {
  return ['PENDING', 'CONFIRMED'].includes(booking.status);
}

export function canCheckInBooking(booking: Booking): boolean {
  if (booking.status !== 'CONFIRMED') return false;
  
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60);
  
  // Allow check-in 15 minutes before appointment
  return minutesUntilStart <= 15;
}

export function getNextBookingStatus(currentStatus: string): string | null {
  const transitions: Record<string, string> = {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'CHECKED_IN',
    CHECKED_IN: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
  };
  
  return transitions[currentStatus] || null;
}

export interface BookingConflict {
  bookingId: string;
  type: 'provider' | 'resource';
  startTime: Date;
  endTime: Date;
}

export function findBookingConflicts(
  newBooking: {
    startTime: Date;
    endTime: Date;
    providerId: string;
  },
  existingBookings: Booking[]
): BookingConflict[] {
  const conflicts: BookingConflict[] = [];
  
  for (const booking of existingBookings) {
    // Skip cancelled bookings
    if (['CANCELLED', 'NO_SHOW'].includes(booking.status)) continue;
    
    const existingStart = new Date(booking.startTime);
    const existingEnd = new Date(booking.endTime);
    
    // Check for time overlap
    const hasOverlap = 
      (newBooking.startTime >= existingStart && newBooking.startTime < existingEnd) ||
      (newBooking.endTime > existingStart && newBooking.endTime <= existingEnd) ||
      (newBooking.startTime <= existingStart && newBooking.endTime >= existingEnd);
    
    if (hasOverlap) {
      // Check provider conflict
      if (booking.providerId === newBooking.providerId) {
        conflicts.push({
          bookingId: booking.id,
          type: 'provider',
          startTime: existingStart,
          endTime: existingEnd,
        });
      }
    }
  }
  
  return conflicts;
}

export function generateBookingReminder(booking: Booking): string {
  const date = new Date(booking.startTime).toLocaleDateString();
  const time = new Date(booking.startTime).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `Reminder: You have an appointment on ${date} at ${time}. ` +
    `Reply CANCEL to cancel or call us if you need to reschedule.`;
}

export function isBookingInPast(booking: Booking): boolean {
  return new Date(booking.endTime) < new Date();
}

export function getBookingProgress(booking: Booking): number {
  if (['CANCELLED', 'NO_SHOW'].includes(booking.status)) return 0;
  if (booking.status === 'COMPLETED') return 100;
  
  const now = new Date();
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  
  return Math.round((elapsed / total) * 100);
}

export function formatAdvanceBookingWindow(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return '0 hours';
  }

  const HOURS_IN_DAY = 24;
  const HOURS_IN_WEEK = HOURS_IN_DAY * 7;
  const HOURS_IN_MONTH = HOURS_IN_DAY * 30;

  const pluralize = (value: number, unit: string) =>
    `${value} ${unit}${value === 1 ? '' : 's'}`;

  if (hours >= HOURS_IN_MONTH && hours % HOURS_IN_MONTH === 0) {
    const months = hours / HOURS_IN_MONTH;
    return pluralize(months, 'month');
  }

  if (hours >= HOURS_IN_WEEK && hours % HOURS_IN_WEEK === 0) {
    const weeks = hours / HOURS_IN_WEEK;
    return pluralize(weeks, 'week');
  }

  if (hours >= HOURS_IN_DAY && hours % HOURS_IN_DAY === 0) {
    const days = hours / HOURS_IN_DAY;
    return pluralize(days, 'day');
  }

  const roundedHours = Math.round(hours * 100) / 100;
  return pluralize(roundedHours, 'hour');
}
