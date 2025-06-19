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
}