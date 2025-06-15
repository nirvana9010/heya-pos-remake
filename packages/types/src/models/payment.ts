// Import PaymentMethod, PaymentStatus and RefundStatus from payments module
import { PaymentMethod, PaymentStatus, RefundStatus } from '../payments';
import type { Invoice } from './';

// Re-export for backwards compatibility
export { PaymentMethod, PaymentStatus, RefundStatus };

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