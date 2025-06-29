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
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  // Payment settings
  requireDeposit: boolean;
  depositPercentage: number; // 1-100
  // Tips settings (disabled by default in Australia)
  enableTips: boolean;
  defaultTipPercentages?: number[]; // e.g., [10, 15, 20]
  allowCustomTipAmount?: boolean;
  // Import settings
  priceToDurationRatio?: number; // $1 = X minutes (default: 1.0)
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