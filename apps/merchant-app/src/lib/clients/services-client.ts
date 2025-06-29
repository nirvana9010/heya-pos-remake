import { BaseApiClient } from './base-client';

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  categoryId?: string;
  category?: ServiceCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  price: number;
  duration: number;
  categoryId?: string;
  isActive?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  categoryId?: string;
  isActive?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Import types
export interface ImportOptions {
  duplicateAction: 'skip' | 'update' | 'create_new';
  createCategories: boolean;
  skipInvalidRows: boolean;
}

export interface ImportPreviewRow {
  rowNumber: number;
  data: any;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  action: 'create' | 'update' | 'skip';
  existingServiceId?: string;
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export class ServicesClient extends BaseApiClient {
  // Services
  async getServices(): Promise<Service[]> {
    const response = await this.get('/services', undefined, 'v1');
    // Real API returns paginated response, extract data
    return response.data || response;
  }

  async getService(id: string): Promise<Service> {
    return this.get(`/services/${id}`, undefined, 'v1');
  }

  async createService(data: CreateServiceRequest): Promise<Service> {
    return this.post('/services', data, undefined, 'v1');
  }

  async updateService(id: string, data: UpdateServiceRequest): Promise<Service> {
    return this.patch(`/services/${id}`, data, undefined, 'v1');
  }

  async deleteService(id: string): Promise<void> {
    return this.delete(`/services/${id}`, undefined, 'v1');
  }

  // Categories
  async getCategories(): Promise<ServiceCategory[]> {
    return this.get('/service-categories', undefined, 'v1');
  }

  async getCategory(id: string): Promise<ServiceCategory> {
    return this.get(`/service-categories/${id}`, undefined, 'v1');
  }

  async createCategory(data: CreateCategoryRequest): Promise<ServiceCategory> {
    return this.post('/service-categories', data, undefined, 'v1');
  }

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<ServiceCategory> {
    return this.patch(`/service-categories/${id}`, data, undefined, 'v1');
  }

  async deleteCategory(id: string): Promise<void> {
    return this.delete(`/service-categories/${id}`, undefined, 'v1');
  }

  // Import methods
  async previewServiceImport(file: File, options: ImportOptions, columnMappings?: Record<string, string>): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add options to formData
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    // Add column mappings if provided
    if (columnMappings) {
      formData.append('columnMappings', JSON.stringify(columnMappings));
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token');

    const response = await fetch(`${API_BASE_URL}/v1/services/import/preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to preview import');
    }

    return response.json();
  }

  async executeServiceImport(rows: ImportPreviewRow[], options: ImportOptions): Promise<ImportResult> {
    return this.post('/services/import/execute', { rows, options }, undefined, 'v1');
  }

  async downloadServiceTemplate(): Promise<void> {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}/v1/services/import/template`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}