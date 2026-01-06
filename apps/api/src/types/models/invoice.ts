export interface Invoice {
  id: string;
  merchantId: string;
  customerId: string;
  bookingId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: Date;
  notes?: string;
  terms?: string;
  createdById: string;
  sentAt?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  items: InvoiceItem[];
  payments?: Payment[];
  customer?: Customer;
  booking?: Booking;
  createdBy?: Staff;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  OVERDUE = "OVERDUE",
  VOIDED = "VOIDED",
  REFUNDED = "REFUNDED",
}

import type { Customer, Booking, Staff, Payment } from "./";
