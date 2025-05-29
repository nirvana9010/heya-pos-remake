import { 
  Booking, 
  Customer, 
  Service, 
  ServiceCategory, 
  Staff,
  Merchant,
  LoginCredentials,
  PinCredentials 
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private token: string | null = null;
  private merchantId: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      (window as any).localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = (window as any).localStorage.getItem('auth_token');
    }
    return this.token;
  }

  setMerchantId(merchantId: string) {
    this.merchantId = merchantId;
    if (typeof window !== 'undefined') {
      (window as any).localStorage.setItem('merchant_id', merchantId);
    }
  }

  getMerchantId(): string | null {
    if (!this.merchantId && typeof window !== 'undefined') {
      this.merchantId = (window as any).localStorage.getItem('merchant_id');
    }
    return this.merchantId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: any = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error((error as any).message || `HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth endpoints
  async merchantLogin(credentials: LoginCredentials) {
    const response = await this.request<{ access_token: string; merchant: Merchant }>('/auth/merchant/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.setToken(response.access_token);
    this.setMerchantId(response.merchant.id);
    
    return response;
  }

  async staffPin(credentials: PinCredentials) {
    return this.request<{ access_token: string; staff: Staff }>('/auth/staff/pin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    this.merchantId = null;
    if (typeof window !== 'undefined') {
      (window as any).localStorage.removeItem('auth_token');
      (window as any).localStorage.removeItem('merchant_id');
    }
  }

  async getMe() {
    return this.request<{ user: Staff | Merchant }>('/auth/me');
  }

  // Services endpoints
  async getServices(params?: {
    categoryId?: string;
    isActive?: boolean;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    if (params?.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    return this.request<{
      data: Service[];
      total: number;
      page: number;
      limit: number;
    }>(`/services?${queryParams}`);
  }

  async getService(id: string) {
    return this.request<Service>(`/services/${id}`);
  }

  async createService(data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: Partial<Service>) {
    return this.request<Service>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string) {
    return this.request<void>(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Service Categories endpoints
  async getServiceCategories() {
    return this.request<ServiceCategory[]>('/service-categories');
  }

  async createServiceCategory(data: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.request<ServiceCategory>('/service-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServiceCategory(id: string, data: Partial<ServiceCategory>) {
    return this.request<ServiceCategory>(`/service-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteServiceCategory(id: string) {
    return this.request<void>(`/service-categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers endpoints
  async getCustomers(params?: {
    search?: string;
    email?: string;
    phone?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.email) queryParams.append('email', params.email);
    if (params?.phone) queryParams.append('phone', params.phone);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    return this.request<{
      data: Customer[];
      total: number;
      page: number;
      limit: number;
    }>(`/customers?${queryParams}`);
  }

  async getCustomer(id: string) {
    return this.request<Customer>(`/customers/${id}`);
  }

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'visitCount' | 'totalSpent' | 'loyaltyPoints'>) {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: Partial<Customer>) {
    return this.request<Customer>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request<void>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookings endpoints
  async getBookings(params?: {
    status?: string;
    customerId?: string;
    providerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.providerId) queryParams.append('providerId', params.providerId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    return this.request<{
      data: Booking[];
      total: number;
      page: number;
      limit: number;
    }>(`/bookings?${queryParams}`);
  }

  async getBooking(id: string) {
    return this.request<Booking>(`/bookings/${id}`);
  }

  async createBooking(data: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    serviceId: string;
    serviceName: string;
    staffId: string;
    staffName: string;
    date: Date;
    startTime: string;
    endTime: string;
    duration: number;
    price: number;
    notes?: string;
  }) {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBooking(id: string, data: Partial<Booking>) {
    return this.request<Booking>(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateBookingStatus(id: string, status: Booking['status']) {
    return this.request<Booking>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async cancelBooking(id: string, reason?: string) {
    return this.request<Booking>(`/bookings/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async checkAvailability(data: {
    date: string;
    serviceId: string;
    staffId?: string;
  }) {
    return this.request<{
      available: boolean;
      slots: string[];
    }>('/bookings/check-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();