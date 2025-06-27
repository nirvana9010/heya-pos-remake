/**
 * Staff Assignment Service
 * 
 * Handles intelligent staff assignment for "Next Available" bookings.
 * This service determines the best available staff member based on:
 * - Current availability (no conflicting bookings)
 * - Workload distribution (fewer bookings = higher priority)
 * - Service capabilities (future enhancement)
 * 
 * This is a critical service for the MVP - it ensures we ALWAYS
 * resolve to a valid staff UUID before sending to the API.
 */

import { format } from 'date-fns';

export interface StaffMember {
  id: string;
  name: string;
  color: string;
}

export interface Booking {
  id: string;
  staffId: string | null;
  date: string;
  time: string;
  duration: number;
  status: string;
}

export interface Service {
  id: string;
  duration: number;
}

export interface AvailabilityResult {
  available: StaffMember[];
  unavailable: Array<{
    staff: StaffMember;
    reason: string;
  }>;
  assignedStaff: StaffMember | null;
  message: string;
}

/**
 * Checks if two time slots conflict
 */
function hasTimeConflict(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date
): boolean {
  // Bookings conflict if they overlap in any way
  return (
    (newStart >= existingStart && newStart < existingEnd) || // New starts during existing
    (newEnd > existingStart && newEnd <= existingEnd) ||     // New ends during existing  
    (newStart <= existingStart && newEnd >= existingEnd)     // New encompasses existing
  );
}

/**
 * Gets the workload (number of bookings) for each staff member
 */
function getStaffWorkloads(
  staff: StaffMember[],
  bookings: Booking[]
): Map<string, number> {
  const workloads = new Map<string, number>();
  
  // Initialize all staff with 0 bookings
  staff.forEach(s => workloads.set(s.id, 0));
  
  // Count active bookings per staff
  bookings.forEach(booking => {
    if (booking.staffId && 
        booking.status !== 'cancelled' && 
        booking.status !== 'no-show') {
      const current = workloads.get(booking.staffId) || 0;
      workloads.set(booking.staffId, current + 1);
    }
  });
  
  return workloads;
}

/**
 * Main function to get available staff and auto-assign the best option
 */
export async function getAvailableStaffWithAssignment(
  serviceId: string,
  startTime: Date,
  duration: number,
  staff: StaffMember[],
  bookings: Booking[]
): Promise<AvailabilityResult> {
  console.log('🔍 [StaffAssignment] Checking availability for:', {
    serviceId,
    startTime: startTime.toISOString(),
    duration,
    staffCount: staff.length,
    bookingCount: bookings.length
  });

  const endTime = new Date(startTime.getTime() + duration * 60000);
  const available: StaffMember[] = [];
  const unavailable: Array<{ staff: StaffMember; reason: string }> = [];
  
  // Get workloads for load balancing
  const workloads = getStaffWorkloads(staff, bookings);
  
  // Check each staff member
  for (const staffMember of staff) {
    // Skip "Unassigned" or system staff
    if (staffMember.name === 'Unassigned' || staffMember.id === 'unassigned') {
      continue;
    }
    
    // Find conflicting bookings for this staff member
    const conflicts = bookings.filter(booking => {
      // Only check bookings for this specific staff member
      if (booking.staffId !== staffMember.id) return false;
      
      // Ignore cancelled or no-show bookings
      if (booking.status === 'cancelled' || booking.status === 'no-show') {
        return false;
      }
      
      // Parse booking time
      const bookingStart = new Date(`${booking.date}T${booking.time}`);
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);
      
      return hasTimeConflict(bookingStart, bookingEnd, startTime, endTime);
    });
    
    if (conflicts.length > 0) {
      // Staff is unavailable
      const conflictTimes = conflicts.map(c => c.time).join(', ');
      unavailable.push({
        staff: staffMember,
        reason: `Busy at ${conflictTimes}`
      });
    } else {
      // Staff is available
      available.push(staffMember);
    }
  }
  
  // Sort available staff by workload (ascending - fewer bookings first)
  available.sort((a, b) => {
    const workloadA = workloads.get(a.id) || 0;
    const workloadB = workloads.get(b.id) || 0;
    return workloadA - workloadB;
  });
  
  // Auto-assign to the best available staff (first in sorted list)
  const assignedStaff = available.length > 0 ? available[0] : null;
  
  // Generate appropriate message
  let message = '';
  if (available.length === 0) {
    message = 'No staff available at this time. Please select a different time.';
  } else if (available.length === 1) {
    message = `${available[0].name} is available`;
  } else {
    message = `${available.length} staff members available`;
  }
  
  console.log('✅ [StaffAssignment] Availability check complete:', {
    available: available.map(s => s.name),
    unavailable: unavailable.length,
    assigned: assignedStaff?.name || 'None',
    workloads: Array.from(workloads.entries())
  });
  
  return {
    available,
    unavailable,
    assignedStaff,
    message
  };
}

/**
 * Validates that a staff ID will be accepted by the backend
 */
export function isValidStaffId(staffId: string | null | undefined): boolean {
  if (!staffId || typeof staffId !== 'string') return false;
  
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(staffId);
}

/**
 * Ensures we have a valid staff ID or throws an error
 */
export function ensureValidStaffId(
  staffId: string | null | undefined,
  assignedStaff: StaffMember | null
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