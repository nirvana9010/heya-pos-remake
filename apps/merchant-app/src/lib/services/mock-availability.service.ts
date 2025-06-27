/**
 * Mock Availability Service
 * Temporary implementation that checks staff availability on the frontend
 * This will be replaced with a proper backend API endpoint later
 */

interface Staff {
  id: string;
  name: string;
  color?: string;
}

interface Booking {
  id: string;
  staffId: string;
  staffName: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
}

interface AvailabilityResult {
  available: Staff[];
  unavailable: { staff: Staff; reason: string }[];
  assignedStaff?: Staff | null;
  message?: string;
}

/**
 * Check if two time slots conflict
 */
function isTimeConflict(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
): boolean {
  // Check if the new booking overlaps with existing booking
  return (
    // New booking starts during existing
    (newStart >= existingStart && newStart < existingEnd) ||
    // New booking ends during existing
    (newEnd > existingStart && newEnd <= existingEnd) ||
    // New booking encompasses existing
    (newStart <= existingStart && newEnd >= existingEnd) ||
    // Existing booking is within new booking
    (existingStart >= newStart && existingEnd <= newEnd)
  );
}

/**
 * Get available staff for a given service and time slot
 * This is a frontend-only implementation that checks against existing bookings
 * 
 * ENHANCED: Now includes auto-assignment logic for "Next Available"
 */
export async function getAvailableStaff(
  serviceId: string,
  startTime: Date,
  duration: number, // in minutes
  staffList: Staff[],
  bookings: Booking[]
): Promise<AvailabilityResult> {
  const endTime = new Date(startTime.getTime() + duration * 60000);
  const available: Staff[] = [];
  const unavailable: { staff: Staff; reason: string }[] = [];

  console.log('🔍 [AvailabilityCheck] Starting check:', {
    serviceId,
    startTime: startTime.toISOString(),
    duration,
    staffCount: staffList.length
  });

  // Filter only active bookings (not cancelled or no-show)
  const activeBookings = bookings.filter(
    booking => !['cancelled', 'no-show'].includes(booking.status.toLowerCase())
  );

  // Build workload map for load balancing
  const workloadMap = new Map<string, number>();
  staffList.forEach(s => workloadMap.set(s.id, 0));
  activeBookings.forEach(booking => {
    if (booking.staffId) {
      const current = workloadMap.get(booking.staffId) || 0;
      workloadMap.set(booking.staffId, current + 1);
    }
  });

  for (const staff of staffList) {
    // Skip "Unassigned" staff if present
    if (staff.name.toLowerCase() === 'unassigned') {
      continue;
    }

    // Find conflicts for this staff member
    const conflicts = activeBookings.filter(booking => {
      if (booking.staffId !== staff.id) return false;
      
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      return isTimeConflict(bookingStart, bookingEnd, startTime, endTime);
    });

    if (conflicts.length > 0) {
      unavailable.push({
        staff,
        reason: `Booked from ${new Date(conflicts[0].startTime).toLocaleTimeString()} to ${new Date(conflicts[0].endTime).toLocaleTimeString()}`
      });
    } else {
      available.push(staff);
    }
  }

  // Sort available staff by number of bookings (load balancing)
  available.sort((a, b) => {
    const aBookings = workloadMap.get(a.id) || 0;
    const bBookings = workloadMap.get(b.id) || 0;
    return aBookings - bBookings;
  });

  // Auto-assign the best available staff (first in sorted list)
  const assignedStaff = available.length > 0 ? available[0] : null;

  // Generate informative message
  let message = '';
  if (available.length === 0) {
    message = 'No staff available at this time. Please select a different time.';
  } else if (available.length === 1) {
    message = `Only ${available[0].name} is available at this time.`;
  } else {
    message = `${available.length} staff members available`;
  }

  console.log('✅ [AvailabilityCheck] Complete:', {
    available: available.map(s => s.name),
    unavailable: unavailable.length,
    assigned: assignedStaff?.name || 'None'
  });

  return { 
    available, 
    unavailable,
    assignedStaff,
    message
  };
}

/**
 * Get the next available time slot for any staff member
 * Returns the earliest time when at least one staff member is available
 */
export function getNextAvailableSlot(
  serviceId: string,
  requestedTime: Date,
  duration: number,
  staffList: Staff[],
  bookings: Booking[],
  maxDaysToCheck: number = 7
): Date | null {
  const slotDuration = 30; // Check 30-minute intervals
  let currentTime = new Date(requestedTime);
  const maxTime = new Date(requestedTime);
  maxTime.setDate(maxTime.getDate() + maxDaysToCheck);

  while (currentTime < maxTime) {
    const result = getAvailableStaff(serviceId, currentTime, duration, staffList, bookings);
    
    // Synchronous check since getAvailableStaff is now synchronous
    if (result.available.length > 0) {
      return currentTime;
    }

    // Move to next slot
    currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    
    // Skip to next day at 9 AM if we're past business hours (e.g., after 6 PM)
    if (currentTime.getHours() >= 18) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(9, 0, 0, 0);
    }
  }

  return null;
}

/**
 * Format availability message for UI
 */
export function formatAvailabilityMessage(result: AvailabilityResult & { message?: string }): string {
  // Use the enhanced message if available
  if (result.message) {
    return result.message;
  }
  
  // Fallback to legacy formatting
  if (result.available.length === 0) {
    return 'No staff available at this time. Please select a different time.';
  }
  
  if (result.available.length === 1) {
    return `Only ${result.available[0].name} is available at this time.`;
  }
  
  return `${result.available.length} staff members available`;
}

/**
 * Validates that a staff ID is a properly formatted UUID
 * This is critical for API compatibility
 */
export function isValidStaffId(staffId: string | null | undefined): boolean {
  if (!staffId || typeof staffId !== 'string') return false;
  
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(staffId);
}

/**
 * Ensures we have a valid staff ID for API submission
 * @throws Error if no valid staff ID can be determined
 */
export function ensureValidStaffId(
  staffId: string | null | undefined,
  assignedStaff: Staff | null | undefined
): string {
  // First try the provided staffId
  if (isValidStaffId(staffId)) {
    return staffId!;
  }
  
  // Then try the assigned staff
  if (assignedStaff && isValidStaffId(assignedStaff.id)) {
    return assignedStaff.id;
  }
  
  // No valid staff ID available
  throw new Error('No valid staff member could be assigned. Please select a specific staff member or try a different time.');
}