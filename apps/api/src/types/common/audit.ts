// Re-export from models/audit.ts for backward compatibility
export type { AuditLog } from '../models/audit';
export { AUDIT_ACTIONS } from '../models/audit';

// Legacy enum for backward compatibility
export enum AuditAction {
  BOOKING_CREATE = 'booking.create',
  BOOKING_UPDATE = 'booking.update',
  BOOKING_CANCEL = 'booking.cancel',
  BOOKING_COMPLETE = 'booking.complete',
  PAYMENT_PROCESS = 'payment.process',
  PAYMENT_REFUND = 'payment.refund',
  CUSTOMER_CREATE = 'customer.create',
  CUSTOMER_UPDATE = 'customer.update',
  STAFF_LOGIN = 'staff.login',
  STAFF_LOGOUT = 'staff.logout',
  SETTINGS_UPDATE = 'settings.update'
}