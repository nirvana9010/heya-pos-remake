/**
 * Booking-related constants used across the merchant app
 */

/**
 * Special staff ID value used to indicate "Next Available" staff selection.
 * When this value is used, the system will automatically assign an available staff member.
 */
export const NEXT_AVAILABLE_STAFF_ID = 'NEXT_AVAILABLE';

/**
 * Check if a staff ID represents "Next Available" selection
 */
export function isNextAvailableStaff(staffId: string | null | undefined): boolean {
  return staffId === NEXT_AVAILABLE_STAFF_ID;
}

/**
 * Get display text for staff selection
 */
export function getStaffDisplayText(staffId: string | null | undefined, staffName?: string): string {
  if (isNextAvailableStaff(staffId)) {
    return 'Next Available';
  }
  return staffName || 'Select staff member';
}