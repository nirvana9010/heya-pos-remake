/**
 * Customer-related constants used across the merchant app
 */

// Special customer ID that backend recognizes as walk-in
export const WALK_IN_CUSTOMER_ID = 'WALK_IN';

// Walk-in customer display object for UI consistency
export const WALK_IN_CUSTOMER = {
  id: WALK_IN_CUSTOMER_ID,
  firstName: 'Walk-in',
  lastName: 'Customer',
  name: 'Walk-in Customer',
  email: '',
  phone: '',
  source: 'WALK_IN'
} as const;

// Check if a customer ID represents a walk-in customer
export const isWalkInCustomer = (customerId?: string | null): boolean => {
  return customerId === WALK_IN_CUSTOMER_ID;
};