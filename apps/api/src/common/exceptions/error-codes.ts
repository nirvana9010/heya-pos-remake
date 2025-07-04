export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_MERCHANT_INACTIVE: 'AUTH_MERCHANT_INACTIVE',
  AUTH_STAFF_INACTIVE: 'AUTH_STAFF_INACTIVE',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_TIME_SLOT: 'INVALID_TIME_SLOT',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Bookings
  BOOKING_TIME_CONFLICT: 'BOOKING_TIME_CONFLICT',
  BOOKING_OUTSIDE_BUSINESS_HOURS: 'BOOKING_OUTSIDE_BUSINESS_HOURS',
  BOOKING_TOO_FAR_IN_ADVANCE: 'BOOKING_TOO_FAR_IN_ADVANCE',
  BOOKING_TOO_CLOSE_TO_START: 'BOOKING_TOO_CLOSE_TO_START',
  BOOKING_INVALID_STATUS_TRANSITION: 'BOOKING_INVALID_STATUS_TRANSITION',
  BOOKING_CANNOT_CANCEL: 'BOOKING_CANNOT_CANCEL',
  BOOKING_STAFF_UNAVAILABLE: 'BOOKING_STAFF_UNAVAILABLE',
  BOOKING_SERVICE_UNAVAILABLE: 'BOOKING_SERVICE_UNAVAILABLE',

  // Customers
  CUSTOMER_EMAIL_EXISTS: 'CUSTOMER_EMAIL_EXISTS',
  CUSTOMER_PHONE_EXISTS: 'CUSTOMER_PHONE_EXISTS',
  CUSTOMER_INACTIVE: 'CUSTOMER_INACTIVE',
  CUSTOMER_BLOCKED: 'CUSTOMER_BLOCKED',

  // Staff
  STAFF_NOT_AT_LOCATION: 'STAFF_NOT_AT_LOCATION',
  STAFF_UNAVAILABLE: 'STAFF_UNAVAILABLE',
  STAFF_NO_PERMISSION: 'STAFF_NO_PERMISSION',
  STAFF_PIN_INVALID: 'STAFF_PIN_INVALID',

  // Services
  SERVICE_INACTIVE: 'SERVICE_INACTIVE',
  SERVICE_REQUIRES_DEPOSIT: 'SERVICE_REQUIRES_DEPOSIT',
  SERVICE_NOT_AVAILABLE_AT_LOCATION: 'SERVICE_NOT_AVAILABLE_AT_LOCATION',

  // Payments
  PAYMENT_INSUFFICIENT_AMOUNT: 'PAYMENT_INSUFFICIENT_AMOUNT',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_PROCESSING_FAILED: 'PAYMENT_PROCESSING_FAILED',
  PAYMENT_REFUND_EXCEEDS_PAID: 'PAYMENT_REFUND_EXCEEDS_PAID',
  PAYMENT_METHOD_NOT_SUPPORTED: 'PAYMENT_METHOD_NOT_SUPPORTED',

  // Orders
  ORDER_ALREADY_COMPLETED: 'ORDER_ALREADY_COMPLETED',
  ORDER_CANNOT_MODIFY: 'ORDER_CANNOT_MODIFY',
  ORDER_INVALID_STATE_TRANSITION: 'ORDER_INVALID_STATE_TRANSITION',

  // Loyalty
  LOYALTY_INSUFFICIENT_POINTS: 'LOYALTY_INSUFFICIENT_POINTS',
  LOYALTY_CARD_INACTIVE: 'LOYALTY_CARD_INACTIVE',
  LOYALTY_PROGRAM_INACTIVE: 'LOYALTY_PROGRAM_INACTIVE',
  LOYALTY_ALREADY_ENROLLED: 'LOYALTY_ALREADY_ENROLLED',

  // Business Rules
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SMS_SEND_FAILED: 'SMS_SEND_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',

  // System
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];