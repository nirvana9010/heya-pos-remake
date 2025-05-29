export interface LoyaltyProgram {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  type: LoyaltyType;
  pointsPerCurrency?: number;
  pointsPerVisit?: number;
  pointsPerDollar?: number;
  rewardThreshold: number;
  rewardValue: number;
  expiryDays?: number;
  isActive: boolean;
  terms?: string;
  tiers?: LoyaltyTier[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  requiredPoints: number;
  multiplier: number;
  benefits: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyCard {
  id: string;
  programId: string;
  customerId: string;
  tierId?: string;
  cardNumber: string;
  points: number;
  lifetimePoints: number;
  status: LoyaltyCardStatus;
  joinedAt: Date;
  lastActivityAt: Date;
  expiresAt?: Date;
  program?: LoyaltyProgram;
  customer?: Customer;
  tier?: LoyaltyTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  cardId: string;
  customerId: string;
  merchantId: string;
  type: LoyaltyTransactionType;
  points: number;
  balance: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  bookingId?: string;
  expiresAt?: Date;
  createdByStaffId?: string;
  createdAt: Date;
}

export enum LoyaltyType {
  POINTS = 'POINTS',
  CASHBACK = 'CASHBACK',
  TIERED = 'TIERED',
  VISIT = 'VISIT',
  SPEND = 'SPEND'
}

export enum LoyaltyCardStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED'
}

export enum LoyaltyTransactionType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  ADJUSTED = 'ADJUSTED'
}

import type { Customer } from './';