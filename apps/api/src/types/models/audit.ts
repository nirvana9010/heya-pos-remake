export interface AuditLog {
  id: string;
  merchantId: string;
  staffId: string;
  action: string; // booking.cancel, payment.refund, etc
  entityType: string;
  entityId: string;
  details: any;
  ipAddress?: string;
  timestamp: Date;
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // Booking actions
  BOOKING_CREATE: "booking.create",
  BOOKING_UPDATE: "booking.update",
  BOOKING_CANCEL: "booking.cancel",
  BOOKING_COMPLETE: "booking.complete",

  // Payment actions
  PAYMENT_PROCESS: "payment.process",
  PAYMENT_REFUND: "payment.refund",

  // Customer actions
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_UPDATE: "customer.update",
  CUSTOMER_DELETE: "customer.delete",

  // Staff actions
  STAFF_LOGIN: "staff.login",
  STAFF_LOGOUT: "staff.logout",
  STAFF_CREATE: "staff.create",
  STAFF_UPDATE: "staff.update",
  STAFF_DELETE: "staff.delete",

  // Service actions
  SERVICE_CREATE: "service.create",
  SERVICE_UPDATE: "service.update",
  SERVICE_DELETE: "service.delete",

  // Settings actions
  SETTINGS_UPDATE: "settings.update",

  // Report actions
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",
} as const;
