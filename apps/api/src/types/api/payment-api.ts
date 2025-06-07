import type { Payment, PaymentMethod, PaymentStatus } from '../models';
import type { PaginationParams } from '../common';

export interface ProcessPaymentRequest {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  // For card payments
  stripePaymentMethodId?: string;
  tyroTerminalId?: string;
  // For cash payments
  cashReceived?: number;
}

export interface ProcessPaymentResponse {
  payment: Payment;
  changeAmount?: number; // For cash payments
  receiptUrl?: string;
}

export interface RefundPaymentRequest {
  paymentId: string;
  amount: number;
  reason: string;
  staffPin?: string;
}

export interface PaymentSearchParams extends PaginationParams {
  locationId?: string;
  invoiceId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentSummary {
  date: Date;
  totalAmount: number;
  byMethod: {
    method: PaymentMethod;
    amount: number;
    count: number;
  }[];
  refundedAmount: number;
  netAmount: number;
}