export interface Merchant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  abn?: string;
  subdomain: string;
  packageId: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEnds?: Date;
  trialEndsAt?: Date;
  stripeCustomerId?: string;
  website?: string;
  logo?: string;
  description?: string;
  status: MerchantStatus;
  settings: MerchantSettings;
  package?: Package;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantSettings {
  bookingAdvanceHours: number;
  cancellationHours: number;
  loyaltyType: 'visit' | 'spend';
  loyaltyRate: number;
  requirePinForRefunds: boolean;
  requirePinForCancellations: boolean;
  requirePinForReports: boolean;
  requirePinForStaff: boolean; // If false, staff can be created without PIN
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  // Payment settings
  requireDeposit: boolean;
  depositPercentage: number; // 1-100
  // Unassigned column settings
  showUnassignedColumn: boolean;
  // Booking behavior settings
  allowUnassignedBookings: boolean;
  // Calendar display settings
  calendarStartHour: number; // 0-23 (default: 6 for 6 AM)
  calendarEndHour: number; // 0-23 (default: 23 for 11 PM)
  // Walk-in customer settings
  allowWalkInBookings: boolean;
  // Import settings
  priceToDurationRatio?: number; // $1 = X minutes (default: 1.0)
  // Business hours
  businessHours?: BusinessHours;
}

export interface BusinessHours {
  monday: BusinessDayHours;
  tuesday: BusinessDayHours;
  wednesday: BusinessDayHours;
  thursday: BusinessDayHours;
  friday: BusinessDayHours;
  saturday: BusinessDayHours;
  sunday: BusinessDayHours;
}

export interface BusinessDayHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  isOpen: boolean;
}

export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED'
}

export interface MerchantAuth {
  id: string;
  merchantId: string;
  username: string;
  passwordHash?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

import type { Package } from './package';