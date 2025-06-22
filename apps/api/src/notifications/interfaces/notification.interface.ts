export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  preferredChannel?: 'email' | 'sms' | 'both';
}

export interface NotificationContext {
  booking?: {
    id: string;
    bookingNumber: string;
    date: Date;
    time: string;
    serviceName: string;
    staffName: string;
    duration: number;
    price: number;
    locationName: string;
    locationAddress?: string;
    locationPhone?: string;
  };
  merchant: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  customer: NotificationRecipient;
}

export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER_24H = 'booking_reminder_24h',
  BOOKING_REMINDER_2H = 'booking_reminder_2h',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_RESCHEDULED = 'booking_rescheduled',
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: 'email' | 'sms';
}