import { MerchantSettings } from '../types/models/merchant';

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  bookingAdvanceHours: 168, // 7 days
  cancellationHours: 24,
  loyaltyType: 'visit',
  loyaltyRate: 10, // 10 points per visit
  requirePinForRefunds: false, // Default to false - all PIN requirements OFF by default
  requirePinForCancellations: false, // Default to false - all PIN requirements OFF by default
  requirePinForReports: false, // Default to false - all PIN requirements OFF by default
  requirePinForStaff: false, // Default to false - all PIN requirements OFF by default
  timezone: 'Australia/Sydney',
  currency: 'AUD',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  requireDeposit: false,
  depositPercentage: 0,
  showUnassignedColumn: false, // Default to false - merchants can enable if needed
  allowUnassignedBookings: false, // Default to false - merchants must explicitly enable unassigned bookings
  autoConfirmBookings: true, // Default to true for backward compatibility
  calendarStartHour: 6, // 6 AM
  calendarEndHour: 23, // 11 PM
  allowWalkInBookings: true, // Default to true for flexibility
  priceToDurationRatio: 1.0, // $1 = 1 minute (default)
  // Customer Notification settings
  // Confirmations, 24h, 2h (EMAIL = true, SMS = false)
  bookingConfirmationEmail: true,
  bookingConfirmationSms: false,
  appointmentReminder24hEmail: true,
  appointmentReminder24hSms: false,
  appointmentReminder2hEmail: true,
  appointmentReminder2hSms: false,
  
  // Staff Notification settings
  // New, Cancellations (PANEL = false, EMAIL = true, SMS = false)
  newBookingNotification: false,
  newBookingNotificationEmail: true,
  newBookingNotificationSms: false,
  cancellationNotification: false,
  cancellationNotificationEmail: true,
  cancellationNotificationSms: false,
};