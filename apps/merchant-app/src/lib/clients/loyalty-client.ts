import { BaseApiClient } from './base-client';

export interface LoyaltyProgram {
  id: string;
  merchantId: string;
  name: string;
  type: 'VISITS' | 'POINTS';
  isActive: boolean;
  visitsRequired?: number;
  visitRewardType?: 'FREE' | 'PERCENTAGE';
  visitRewardValue?: number;
  pointsPerDollar?: number;
  pointsValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLoyalty {
  type: 'VISITS' | 'POINTS';
  currentVisits?: number;
  visitsRequired?: number;
  rewardAvailable?: boolean;
  rewardType?: 'FREE' | 'PERCENTAGE';
  rewardValue?: number;
  lifetimeVisits?: number;
  currentPoints?: number;
  pointsValue?: number;
  dollarValue?: number;
  transactions?: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  merchantId: string;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
  points?: number;
  visitsDelta?: number;
  balance?: number;
  description: string;
  bookingId?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
}

export interface LoyaltyCheckResponse {
  hasProgram: boolean;
  type: 'VISITS' | 'POINTS' | null;
  currentPoints?: number;
  currentVisits?: number;
  visitsRequired?: number;
  rewardAvailable?: boolean;
  rewardType?: 'FREE' | 'PERCENTAGE';
  rewardValue?: number;
  dollarValue?: number;
}

export class LoyaltyClient extends BaseApiClient {
  async getProgram(): Promise<LoyaltyProgram> {
    return this.get('/loyalty/program', undefined, 'v1');
  }

  async updateProgram(data: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> {
    return this.post('/loyalty/program', data, undefined, 'v1');
  }

  async getCustomerLoyalty(customerId: string): Promise<CustomerLoyalty> {
    return this.get(`/loyalty/customers/${customerId}`, undefined, 'v1');
  }

  async check(customerId: string): Promise<LoyaltyCheckResponse> {
    return this.get(`/loyalty/check/${customerId}`, undefined, 'v1');
  }

  async redeemVisit(customerId: string, bookingId?: string): Promise<{
    success: boolean;
    rewardType: 'FREE' | 'PERCENTAGE';
    rewardValue: number;
    message: string;
  }> {
    return this.post('/loyalty/redeem-visit', { customerId, bookingId }, undefined, 'v1');
  }

  async redeemPoints(customerId: string, points: number, bookingId?: string): Promise<{
    success: boolean;
    dollarValue: number;
    remainingPoints: number;
    message: string;
  }> {
    return this.post('/loyalty/redeem-points', { customerId, points, bookingId }, undefined, 'v1');
  }

  async adjustLoyalty(customerId: string, adjustment: {
    points?: number;
    visits?: number;
    reason: string;
  }): Promise<any> {
    return this.post('/loyalty/adjust', { customerId, ...adjustment }, undefined, 'v1');
  }
}