import { MerchantSettings } from '../types/models/merchant';

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  bookingAdvanceHours: 168, // 7 days
  cancellationHours: 24,
  loyaltyType: 'visit',
  loyaltyRate: 10, // 10 points per visit
  requirePinForRefunds: true,
  requirePinForCancellations: true,
  timezone: 'Australia/Sydney',
  currency: 'AUD',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  requireDeposit: false,
  depositPercentage: 0,
  showUnassignedColumn: false, // Default to false, will be set to true for single-staff merchants
};