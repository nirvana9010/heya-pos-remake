import { BaseApiClient } from './base-client';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  method: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerId?: string;
  bookingId?: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderRequest {
  customerId?: string;
  bookingId?: string;
  items?: OrderItem[];
}

export interface ProcessPaymentRequest {
  orderId: string;
  amount: number;
  method: string;
  tipAmount?: number;
}

export interface RefundPaymentRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

export class PaymentsClient extends BaseApiClient {
  // Orders
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    return this.post('/payments/orders', data, undefined, 'v1');
  }

  async createOrderFromBooking(bookingId: string): Promise<Order> {
    return this.post(`/payments/orders/from-booking/${bookingId}`, undefined, undefined, 'v1');
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.get(`/payments/orders/${orderId}`, undefined, 'v1');
  }

  async addOrderItems(orderId: string, items: OrderItem[]): Promise<Order> {
    return this.post(`/payments/orders/${orderId}/items`, { items }, undefined, 'v1');
  }

  async addOrderModifier(orderId: string, modifier: any): Promise<Order> {
    return this.post(`/payments/orders/${orderId}/modifiers`, modifier, undefined, 'v1');
  }

  async updateOrderState(orderId: string, state: string): Promise<Order> {
    return this.post(`/payments/orders/${orderId}/state`, { state }, undefined, 'v1');
  }

  // Payments
  async processPayment(data: ProcessPaymentRequest): Promise<Payment> {
    return this.post('/payments/process', data, undefined, 'v1');
  }

  async processSplitPayment(data: any): Promise<Payment> {
    return this.post('/payments/split', data, undefined, 'v1');
  }

  async refundPayment(request: RefundPaymentRequest): Promise<Payment> {
    return this.post('/payments/refund', request, undefined, 'v1');
  }

  async voidPayment(paymentId: string): Promise<Payment> {
    return this.post(`/payments/void/${paymentId}`, undefined, undefined, 'v1');
  }

  async getPayments(params?: { page?: number; limit?: number; locationId?: string }): Promise<{ payments: any[]; pagination: any }> {
    return this.get('/payments', { params }, 'v1');
  }
}