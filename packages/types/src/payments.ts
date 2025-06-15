// Payment-related types and interfaces

export enum PaymentMethod {
  CASH = 'CASH',
  CARD_TYRO = 'CARD_TYRO',
  CARD_STRIPE = 'CARD_STRIPE',
  CARD_MANUAL = 'CARD_MANUAL',
  GIFT_CARD = 'GIFT_CARD',
  STORE_CREDIT = 'STORE_CREDIT',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  VOIDED = 'VOIDED'
}

export enum RefundStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum OrderState {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum OrderModifierType {
  DISCOUNT = 'DISCOUNT',
  SURCHARGE = 'SURCHARGE'
}

export enum OrderModifierCalculation {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  amount: number;
  method: PaymentMethod;
  error?: string;
  gatewayResponse?: any;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  error?: string;
}

export interface ProcessPaymentDto {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  tipAmount?: number; // Optional, controlled by settings
  reference?: string;
  metadata?: Record<string, any>;
}

export interface SplitPaymentDto {
  orderId: string;
  payments: Array<{
    amount: number;
    method: PaymentMethod;
    tipAmount?: number;
    reference?: string;
  }>;
}

export interface OrderModifierDto {
  type: OrderModifierType;
  subtype?: string; // e.g., 'LOYALTY', 'STAFF_DISCOUNT', 'LATE_FEE'
  calculation: OrderModifierCalculation;
  value: number;
  description: string;
  appliesTo?: string[]; // Item IDs, or null for whole order
}

export interface PaymentGatewayConfig {
  provider: 'TYRO' | 'STRIPE' | 'SQUARE';
  apiKey?: string;
  merchantId?: string;
  terminalId?: string;
  testMode: boolean;
}

// Payment gateway abstraction
export interface IPaymentGateway {
  initialize(config: PaymentGatewayConfig): Promise<void>;
  
  // Terminal-based payments
  createTerminalPayment(amount: number, orderId: string): Promise<string>;
  getTerminalStatus(referenceId: string): Promise<PaymentResult>;
  
  // Refunds and voids
  refundPayment(paymentId: string, amount: number, reason?: string): Promise<RefundResult>;
  voidPayment(paymentId: string): Promise<RefundResult>;
  
  // Health check
  isConnected(): Promise<boolean>;
}

// For future card-on-file implementation
export interface StoredPaymentMethod {
  id: string;
  clientId: string;
  gateway: string;
  gatewayToken: string;
  cardType: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  consent?: {
    agreedAt: Date;
    ipAddress: string;
    policyVersion: string;
  };
}