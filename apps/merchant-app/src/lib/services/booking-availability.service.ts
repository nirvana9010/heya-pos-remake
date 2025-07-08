import { apiClient } from '../api-client';
import { NEXT_AVAILABLE_STAFF_ID, isNextAvailableStaff } from '../constants/booking-constants';

export interface StaffAvailability {
  available: Array<{ id: string; name: string; color: string }>;
  unavailable: Array<{ id: string; name: string; reason: string; color: string }>;
  assignedStaff?: { id: string; name: string; color: string };
}

/**
 * Check staff availability using the real API
 */
export async function checkStaffAvailability(
  serviceId: string,
  startTime: Date,
  duration: number,
  staff: Array<{ id: string; name: string; color: string }>,
  bookings: Array<any> = []
): Promise<StaffAvailability> {
  try {
    // If no valid serviceId, return all staff as available
    if (!serviceId || serviceId === 'undefined') {
      return {
        available: staff.filter(s => 
          s.name.toLowerCase() !== 'unassigned' && 
          s.id.toLowerCase() !== 'unassigned'
        ),
        unavailable: []
      };
    }
    
    // Get the date string for the API
    const dateStr = startTime.toISOString().split('T')[0];
    
    // Initialize result
    const result: StaffAvailability = {
      available: [],
      unavailable: []
    };
    
    // For "Next Available", we need to check all staff
    const staffToCheck = staff.filter(s => 
      s.name.toLowerCase() !== 'unassigned' && 
      s.id.toLowerCase() !== 'unassigned'
    );
    
    // Check availability for each staff member
    const availabilityPromises = staffToCheck.map(async (staffMember) => {
      try {
        const response = await apiClient.checkAvailability({
          date: startTime,
          serviceId,
          staffId: staffMember.id,
          services: [{ id: serviceId, duration }]
        });
        
        if (!response || !response.availableSlots) {
          return { staffMember, isAvailable: false, reason: 'Unable to check availability' };
        }
        
        // Check if the requested time slot is available
        const requestedTimeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
        const isSlotAvailable = response.availableSlots.some((slot: any) => 
          slot.time === requestedTimeStr && slot.available !== false
        );
        
        return {
          staffMember,
          isAvailable: isSlotAvailable,
          reason: isSlotAvailable ? null : 'Not available at this time'
        };
      } catch (error) {
        console.error(`Error checking availability for ${staffMember.name}:`, error);
        return { staffMember, isAvailable: false, reason: 'Error checking availability' };
      }
    });
    
    const availabilityResults = await Promise.all(availabilityPromises);
    
    // Sort results into available and unavailable
    availabilityResults.forEach(({ staffMember, isAvailable, reason }) => {
      if (isAvailable) {
        result.available.push(staffMember);
      } else {
        result.unavailable.push({
          ...staffMember,
          reason: reason || 'Not available'
        });
      }
    });
    
    // If checking for "Next Available", assign the first available staff
    if (result.available.length > 0) {
      result.assignedStaff = result.available[0];
    }
    
    return result;
  } catch (error) {
    console.error('Error checking staff availability:', error);
    
    // Fallback to all staff being available if API fails
    return {
      available: staff.filter(s => 
        s.name.toLowerCase() !== 'unassigned' && 
        s.id.toLowerCase() !== 'unassigned'
      ),
      unavailable: []
    };
  }
}

/**
 * Format availability message based on results
 */
export function formatAvailabilityMessage(availability: StaffAvailability): string {
  const { available, unavailable } = availability;
  
  if (available.length === 0) {
    return 'No staff available at this time';
  }
  
  if (unavailable.length === 0) {
    return 'All staff available';
  }
  
  const availableCount = available.length;
  const totalCount = available.length + unavailable.length;
  
  return `${availableCount} of ${totalCount} staff available`;
}

/**
 * Ensure a valid staff ID is selected
 */
export function ensureValidStaffId(
  staffId: string | undefined,
  availableStaff: Array<{ id: string }>,
  allStaff: Array<{ id: string }>
): string {
  // If Next Available is selected, keep it
  if (isNextAvailableStaff(staffId)) {
    return NEXT_AVAILABLE_STAFF_ID;
  }
  
  // If staff ID is valid and available, keep it
  if (staffId && availableStaff.some(s => s.id === staffId)) {
    return staffId;
  }
  
  // If staff ID exists but not available, return empty
  if (staffId && allStaff.some(s => s.id === staffId)) {
    return '';
  }
  
  // Default to first available staff
  if (availableStaff.length > 0) {
    return availableStaff[0].id;
  }
  
  // No staff available
  return '';
}

/**
 * Check if a staff ID is valid
 */
export function isValidStaffId(staffId: string | undefined): boolean {
  return !!staffId && staffId !== '';
}