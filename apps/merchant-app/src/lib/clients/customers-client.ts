import { BaseApiClient, resolveApiBaseUrl } from './base-client';

export interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile?: string | null;
  notes?: string | null;
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
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  notes?: string | null;
}

export interface CustomerImportOptions {
  duplicateAction: 'skip' | 'update';
  skipInvalidRows: boolean;
}

export interface CustomerImportData {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  source?: string;
  notes?: string;
  marketingConsent?: boolean;
  smsNotifications?: boolean;
  notificationPreference?: string;
  status?: string;
}

export interface CustomerImportPreviewRow {
  rowNumber: number;
  original: Record<string, any>;
  data?: CustomerImportData;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  action: 'create' | 'update' | 'skip';
  existingCustomerId?: string;
}

export interface CustomerImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
}

export interface CustomerImportPreview {
  rows: CustomerImportPreviewRow[];
  summary: CustomerImportSummary;
}

export interface CustomerImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface CustomerImportExecutionRow {
  rowNumber: number;
  data?: CustomerImportData;
  validation: {
    isValid: boolean;
  };
  action: 'create' | 'update' | 'skip';
  existingCustomerId?: string;
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

  async previewCustomerImport(
    file: File,
    options: CustomerImportOptions,
    columnMappings?: Record<string, string>,
  ): Promise<CustomerImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    if (columnMappings) {
      formData.append('columnMappings', JSON.stringify(columnMappings));
    }

    const API_BASE_URL = resolveApiBaseUrl();
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${API_BASE_URL}/v1/customers/import/preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to preview customer import');
    }

    return response.json();
  }

  async executeCustomerImport(
    rows: CustomerImportPreviewRow[],
    options: CustomerImportOptions,
  ): Promise<CustomerImportResult> {
    const payloadRows: CustomerImportExecutionRow[] = rows.map(row => ({
      rowNumber: row.rowNumber,
      data: row.data,
      validation: {
        isValid: row.validation?.isValid ?? true,
      },
      action: row.action,
      existingCustomerId: row.existingCustomerId,
    }));

    return this.post('/customers/import/execute', { rows: payloadRows, options }, undefined, 'v1');
  }
}
