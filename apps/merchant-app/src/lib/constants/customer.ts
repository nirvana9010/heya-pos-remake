/**
 * Customer-related constants
 */

// Special identifier for walk-in customers
// This is recognized by the backend and handled specially
export const WALK_IN_CUSTOMER_ID = 'WALK_IN';

// Virtual walk-in customer object for UI display
export const WALK_IN_CUSTOMER = {
  id: WALK_IN_CUSTOMER_ID,
  firstName: 'Walk-in',
  lastName: 'Customer',
  email: 'walkin@customer.local',
  phone: '',
  source: 'WALK_IN' as const,
  // Display name for UI
  name: 'Walk-in Customer',
} as const;

// Type guard to check if a customer ID is the walk-in customer
export function isWalkInCustomer(customerId: string | null | undefined): boolean {
  return customerId === WALK_IN_CUSTOMER_ID;
}