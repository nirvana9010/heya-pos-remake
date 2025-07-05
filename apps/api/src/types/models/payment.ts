export interface Payment {
  id: string;
  merchantId: string;
  locationId: string;
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference?: string;
  stripePaymentIntentId?: string;
  tyroTransactionId?: string;
  processorResponse?: any;
  notes?: string;
  processedAt?: Date;
  failedAt?: Date;
  refundedAmount: number;
  refunds?: PaymentRefund[];
  invoice?: Invoice;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRefund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  reference?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum RefundStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

import type { Invoice } from './';