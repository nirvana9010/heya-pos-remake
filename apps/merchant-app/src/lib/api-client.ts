/**
 * API Client - Refactored for Phase 2 System Stabilization
 * 
 * This file now re-exports the new modular API client structure.
 * The old monolithic client has been split into focused domain clients
 * for better maintainability and type safety.
 */

export { apiClient, ApiClient } from './clients';

// Export types for components to use
export type {
  Booking,
  CreateBookingRequest,
  UpdateBookingRequest,
  RescheduleBookingRequest,
} from './clients/bookings-client';

export type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './clients/customers-client';

export type {
  Service,
  ServiceCategory,
  CreateServiceRequest,
  UpdateServiceRequest,
} from './clients/services-client';

export type {
  Staff,
  CreateStaffRequest,
  UpdateStaffRequest,
} from './clients/staff-client';

export type {
  Payment,
  Order,
  OrderItem,
  ProcessPaymentRequest,
} from './clients/payments-client';

export type {
  ReportData,
  DashboardStats,
} from './clients/reports-client';

export type {
  Location,
  MerchantSettings,
} from './clients/locations-client';

export type {
  LoginResponse,
} from './clients/auth-client';

export type {
  ApiError,
} from './clients/base-client';