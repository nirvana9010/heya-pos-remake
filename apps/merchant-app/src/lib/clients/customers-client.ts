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
  async getCustomers(): Promise<Customer[]> {
    const response = await this.get('/customers', undefined, 'v1');
    // Real API returns paginated response, extract data
    return response.data || response;
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
}