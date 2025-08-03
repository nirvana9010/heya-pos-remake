import { addMinutes, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns';

export interface DragValidationResult {
  canDrop: boolean;
  reason?: string;
  conflictingBookings?: any[];
}

export interface TimeSlot {
  staffId: string;
  startTime: Date;
  endTime: Date;
}

// Business hours configuration (should come from merchant settings)
const DEFAULT_BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 18,  // 6 PM
};

/**
 * Validate if a booking can be dropped in a specific time slot
 */
export function validateBookingDrop(
  booking: any,
  targetSlot: TimeSlot,
  allBookings: any[],
  businessHours = DEFAULT_BUSINESS_HOURS
): DragValidationResult {
  // 1. Allow moving to past times - businesses need this flexibility
  // (Removed past time restriction - staff may need to record what actually happened)

  // 2. Check business hours
  const slotHour = targetSlot.startTime.getHours();
  const slotEndHour = targetSlot.endTime.getHours();
  
  if (slotHour < businessHours.start || slotEndHour > businessHours.end) {
    return {
      canDrop: false,
      reason: "Outside business hours",
    };
  }

  // 3. Calculate new booking end time
  const bookingDuration = booking.duration || 60; // Default 60 minutes
  const newEndTime = addMinutes(targetSlot.startTime, bookingDuration);

  // 4. Check for conflicts with other bookings
  const conflicts = detectTimeConflicts(
    targetSlot.staffId,
    targetSlot.startTime,
    newEndTime,
    allBookings,
    booking.id // Exclude current booking from conflict check
  );


  if (conflicts.length > 0) {
    return {
      canDrop: false,
      reason: "Time slot occupied",
      conflictingBookings: conflicts,
    };
  }

  // 5. Check if booking duration fits in the business day
  if (newEndTime.getHours() > businessHours.end || 
      (newEndTime.getHours() === businessHours.end && newEndTime.getMinutes() > 0)) {
    return {
      canDrop: false,
      reason: "Booking extends beyond business hours",
    };
  }

  return { canDrop: true };
}

/**
 * Detect time conflicts for a given staff member and time range
 */
export function detectTimeConflicts(
  staffId: string,
  startTime: Date,
  endTime: Date,
  bookings: any[],
  excludeBookingId?: string
): any[] {
  return bookings.filter(booking => {
    // Skip if different staff
    if (booking.staffId !== staffId) return false;
    
    // Skip if it's the booking being moved
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }
    
    // Skip cancelled or no-show bookings
    if (booking.status === 'cancelled' || booking.status === 'no-show') return false;

    // Check for time overlap
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    const overlaps = areIntervalsOverlapping(
      { start: startTime, end: endTime },
      { start: bookingStart, end: bookingEnd }
    );

    if (overlaps) {
      // Found conflict:
    }

    return overlaps;
  });
}

/**
 * Calculate the new time slot based on drop position
 */
export function calculateDropTime(
  dropY: number,
  containerTop: number,
  slotHeight: number,
  timeInterval: number,
  baseDate: Date,
  businessHours = DEFAULT_BUSINESS_HOURS
): Date {
  const relativeY = dropY - containerTop;
  const slotIndex = Math.floor(relativeY / slotHeight);
  
  // Calculate hours and minutes
  const totalMinutes = slotIndex * timeInterval;
  const hours = Math.floor(totalMinutes / 60) + businessHours.start;
  const minutes = totalMinutes % 60;
  
  // Create new date with calculated time
  const newTime = new Date(baseDate);
  newTime.setHours(hours, minutes, 0, 0);
  
  return newTime;
}

/**
 * Find alternative available slots for a booking
 */
export function findAlternativeSlots(
  staffId: string,
  duration: number,
  preferredTime: Date,
  bookings: any[],
  maxSuggestions = 3
): TimeSlot[] {
  const alternatives: TimeSlot[] = [];
  const searchDate = new Date(preferredTime);
  
  // Search forward and backward from preferred time
  const searchOffsets = [30, -30, 60, -60, 90, -90, 120, -120]; // minutes
  
  for (const offset of searchOffsets) {
    if (alternatives.length >= maxSuggestions) break;
    
    const candidateTime = addMinutes(preferredTime, offset);
    const candidateEndTime = addMinutes(candidateTime, duration);
    
    // Validate the candidate slot
    const validation = validateBookingDrop(
      { duration },
      { staffId, startTime: candidateTime, endTime: candidateEndTime },
      bookings
    );
    
    if (validation.canDrop) {
      alternatives.push({
        staffId,
        startTime: candidateTime,
        endTime: candidateEndTime,
      });
    }
  }
  
  return alternatives;
}

/**
 * Snap time to nearest interval
 */
export function snapToTimeInterval(time: Date, intervalMinutes: number): Date {
  const minutes = time.getMinutes();
  const remainder = minutes % intervalMinutes;
  const snappedMinutes = remainder < intervalMinutes / 2
    ? minutes - remainder
    : minutes + (intervalMinutes - remainder);
  
  const snappedTime = new Date(time);
  snappedTime.setMinutes(snappedMinutes, 0, 0);
  
  return snappedTime;
}