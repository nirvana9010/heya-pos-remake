import { MerchantSettings } from '../types/models/merchant';

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  bookingAdvanceHours: 168, // 7 days
  cancellationHours: 24,
  loyaltyType: 'visit',
  loyaltyRate: 10, // 10 points per visit
  requirePinForRefunds: true,
  requirePinForCancellations: true,
  requirePinForReports: true,
  requirePinForStaff: true, // Default to true for backward compatibility
  timezone: 'Australia/Sydney',
  currency: 'AUD',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  requireDeposit: false,
  depositPercentage: 0,
  showUnassignedColumn: false, // Default to false - merchants can enable if needed
  allowUnassignedBookings: false, // Default to false - merchants must explicitly enable unassigned bookings
  calendarStartHour: 6, // 6 AM
  calendarEndHour: 23, // 11 PM
  allowWalkInBookings: true, // Default to true for flexibility
  priceToDurationRatio: 1.0, // $1 = 1 minute (default)
};