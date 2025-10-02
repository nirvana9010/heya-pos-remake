/**
 * SINGLE SOURCE OF TRUTH for API configuration
 * 
 * NEVER hardcode API URLs anywhere in the codebase.
 * ALWAYS import from this file.
 * 
 * This prevents the recurring mistake of missing the /api path
 */

// Base URL MUST include /api path
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://100.107.58.75:3000/api';

// API versions
export const API_V1 = `${API_BASE_URL}/v1`;
export const API_V2 = `${API_BASE_URL}/v2`;

// Common endpoints
export const API_ENDPOINTS = {
  // Auth endpoints (V1)
  LOGIN: `${API_V1}/auth/merchant/login`,
  REFRESH: `${API_V1}/auth/refresh`,
  LOGOUT: `${API_V1}/auth/logout`,
  
  // Merchant endpoints (V1)
  MERCHANT_SETTINGS: `${API_V1}/merchant/settings`,
  MERCHANT_PROFILE: `${API_V1}/merchant/profile`,
  
  // Booking endpoints (V2 - CQRS pattern)
  BOOKINGS: `${API_V2}/bookings`,
  
  // Everything else (V1)
  CUSTOMERS: `${API_V1}/customers`,
  STAFF: `${API_V1}/staff`,
  SERVICES: `${API_V1}/services`,
  LOCATIONS: `${API_V1}/locations`,
} as const;

// Helper to build endpoint with ID
export const buildEndpoint = (base: string, id?: string) => {
  return id ? `${base}/${id}` : base;
};
