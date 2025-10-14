export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  preferredChannel?: 'email' | 'sms' | 'both';
  emailNotifications?: boolean;
  smsNotifications?: boolean;
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
    customerName?: string;
    customerPhone?: string;
  };
  merchant: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  customer: NotificationRecipient;
  loyaltyReminder?: {
    sequence: number;
    emailSubject?: string;
    emailBody?: string;
    smsBody?: string;
    programType: 'VISITS' | 'POINTS';
    thresholdValue: number;
    currentValue: number;
    rewardType?: string | null;
    rewardValue?: number | null;
    pointsValue?: number | null;
  };
}

export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER_24H = 'booking_reminder_24h',
  BOOKING_REMINDER_2H = 'booking_reminder_2h',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_RESCHEDULED = 'booking_rescheduled',
  BOOKING_NEW_STAFF = 'booking_new_staff',
  BOOKING_CANCELLED_STAFF = 'booking_cancelled_staff',
  LOYALTY_TOUCHPOINT_1 = 'loyalty_touchpoint_1',
  LOYALTY_TOUCHPOINT_2 = 'loyalty_touchpoint_2',
  LOYALTY_TOUCHPOINT_3 = 'loyalty_touchpoint_3',
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: 'email' | 'sms';
}
