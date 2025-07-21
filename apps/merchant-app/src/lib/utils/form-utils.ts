/**
 * Utility functions for handling form data safely
 */

// Type definitions for safer customer data handling
export interface SafeCustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface SafeLoyaltyFormData {
  loyaltyVisits: number;
  loyaltyPoints: number;
}

/**
 * Converts a value to a string, handling null/undefined by returning empty string
 * This prevents React input warnings about null values
 */
export function safeString(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Converts a number value, handling null/undefined by returning 0
 */
export function safeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

/**
 * Safely prepares customer data for forms, ensuring no null values
 */
export function safeCustomerFormData(customer: any): SafeCustomerFormData {
  return {
    firstName: safeString(customer?.firstName),
    lastName: safeString(customer?.lastName),
    email: safeString(customer?.email),
    phone: safeString(customer?.mobile || customer?.phone),
    notes: safeString(customer?.notes),
  };
}

/**
 * Safely prepares loyalty data for forms
 */
export function safeLoyaltyFormData(customer: any): SafeLoyaltyFormData {
  return {
    loyaltyVisits: safeNumber(customer?.loyaltyVisits),
    loyaltyPoints: safeNumber(customer?.loyaltyPoints),
  };
}