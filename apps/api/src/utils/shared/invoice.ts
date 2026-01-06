import type { Invoice, InvoiceItem, Payment } from "../../types";

export function calculateInvoiceSubtotal(items: InvoiceItem[]): number {
  return items.reduce((total, item) => {
    const itemSubtotal = item.quantity * item.unitPrice - item.discount;
    return total + itemSubtotal;
  }, 0);
}

export function calculateInvoiceTax(items: InvoiceItem[]): number {
  return items.reduce((total, item) => total + item.taxAmount, 0);
}

export function calculateInvoiceTotal(invoice: Partial<Invoice>): number {
  const subtotal = invoice.subtotal || 0;
  const tax = invoice.taxAmount || 0;
  const discount = invoice.discountAmount || 0;

  return subtotal + tax - discount;
}

export function calculateInvoiceBalance(invoice: Invoice): number {
  return invoice.totalAmount - invoice.paidAmount;
}

export function isInvoicePaid(invoice: Invoice): boolean {
  return invoice.paidAmount >= invoice.totalAmount;
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (isInvoicePaid(invoice)) return false;
  return new Date(invoice.dueDate) < new Date();
}

export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "gray",
    SENT: "blue",
    PAID: "green",
    PARTIALLY_PAID: "yellow",
    OVERDUE: "red",
    VOIDED: "gray",
  };

  return colors[status] || "gray";
}

export function createInvoiceItems(
  services: Array<{
    name: string;
    price: number;
    quantity: number;
    taxRate: number;
    discount?: number;
  }>,
): Partial<InvoiceItem>[] {
  return services.map((service, index) => {
    const subtotal = service.price * service.quantity;
    const discountAmount = service.discount || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * service.taxRate;

    return {
      description: service.name,
      quantity: service.quantity,
      unitPrice: service.price,
      discount: discountAmount,
      taxRate: service.taxRate,
      taxAmount: taxAmount,
      total: taxableAmount + taxAmount,
      sortOrder: index,
    };
  });
}

export function calculatePaymentAllocation(
  invoice: Invoice,
  paymentAmount: number,
): {
  allocated: number;
  remaining: number;
  invoicePaid: boolean;
} {
  const balance = calculateInvoiceBalance(invoice);
  const allocated = Math.min(paymentAmount, balance);
  const remaining = paymentAmount - allocated;
  const invoicePaid = allocated >= balance;

  return { allocated, remaining, invoicePaid };
}

export function getPaymentSummary(payments: Payment[]): {
  total: number;
  byMethod: Record<string, number>;
  refunded: number;
  net: number;
} {
  const summary = {
    total: 0,
    byMethod: {} as Record<string, number>,
    refunded: 0,
    net: 0,
  };

  for (const payment of payments) {
    if (payment.status === "COMPLETED") {
      summary.total += payment.amount;
      summary.byMethod[payment.paymentMethod] =
        (summary.byMethod[payment.paymentMethod] || 0) + payment.amount;
      summary.refunded += payment.refundedAmount;
    }
  }

  summary.net = summary.total - summary.refunded;

  return summary;
}

export function generateInvoiceTerms(daysUntilDue: number = 30): string {
  return (
    `Payment is due within ${daysUntilDue} days of invoice date. ` +
    `Late payments may incur additional charges.`
  );
}

export function canRefundPayment(payment: Payment): boolean {
  if (payment.status !== "COMPLETED") return false;
  return payment.amount > payment.refundedAmount;
}

export function getMaxRefundAmount(payment: Payment): number {
  return payment.amount - payment.refundedAmount;
}

export interface TaxBreakdown {
  rate: number;
  amount: number;
  items: InvoiceItem[];
}

export function getInvoiceTaxBreakdown(items: InvoiceItem[]): TaxBreakdown[] {
  const taxGroups = new Map<number, TaxBreakdown>();

  for (const item of items) {
    const existing = taxGroups.get(item.taxRate) || {
      rate: item.taxRate,
      amount: 0,
      items: [],
    };

    existing.amount += item.taxAmount;
    existing.items.push(item);
    taxGroups.set(item.taxRate, existing);
  }

  return Array.from(taxGroups.values()).sort((a, b) => b.rate - a.rate);
}
