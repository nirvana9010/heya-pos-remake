import type { LoyaltyTransaction, LoyaltyTransactionType } from "../models";
import type { PaginationParams } from "../common";

export interface CreateLoyaltyProgramRequest {
  name: string;
  description?: string;
  type: "visit" | "spend";
  pointsPerVisit?: number;
  pointsPerDollar?: number;
  rewardThreshold: number;
  rewardValue: number;
  expiryDays?: number;
  terms?: string;
}

export interface UpdateLoyaltyProgramRequest
  extends Partial<CreateLoyaltyProgramRequest> {
  isActive?: boolean;
}

export interface AdjustLoyaltyPointsRequest {
  customerId: string;
  points: number;
  type: LoyaltyTransactionType;
  description: string;
  staffPin?: string;
}

export interface RedeemLoyaltyPointsRequest {
  customerId: string;
  points: number;
  invoiceId?: string;
  description?: string;
}

export interface LoyaltyTransactionSearchParams extends PaginationParams {
  customerId?: string;
  type?: LoyaltyTransactionType;
  startDate?: Date;
  endDate?: Date;
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerMember: number;
  topMembers: {
    customerId: string;
    customerName: string;
    points: number;
    lifetimePoints: number;
  }[];
}
