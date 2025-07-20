import { BaseApiClient } from './base-client';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  visitCount?: number;
  totalSpent?: number;
  loyaltyPoints?: number;
  loyaltyVisits?: number;
  lifetimeVisits?: number;
  name?: string;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
}

export class CustomersClient extends BaseApiClient {
  async getCustomers(params?: { limit?: number; page?: number; search?: string }): Promise<{
    data: Customer[];
    meta?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const response = await this.get('/customers', { params }, 'v1');
    // Return full paginated response
    return response;
  }

  async searchCustomers(query: string): Promise<{
    data: Customer[];
    displayed: number;
    total: number;
    hasMore: boolean;
  }> {
    return this.get('/customers/search', { params: { q: query } }, 'v1');
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.get(`/customers/${id}`, undefined, 'v1');
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    return this.post('/customers', data, undefined, 'v1');
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    return this.patch(`/customers/${id}`, data, undefined, 'v1');
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.delete(`/customers/${id}`, undefined, 'v1');
  }

  async getStats(): Promise<{
    total: number;
    vip: number;
    newThisMonth: number;
    totalRevenue: number;
  }> {
    return this.get('/customers/stats', undefined, 'v1');
  }
}