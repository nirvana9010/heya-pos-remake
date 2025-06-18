import apiClient from './api-client';

export interface Package {
  id: string;
  name: string;
  description?: string;
  maxStaff: number;
  maxServices: number;
  maxBookingsPerMonth: number;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isActive: boolean;
}

export interface CreateMerchantData {
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  username: string;
  password: string;
  packageId: string;
  abn?: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  abn?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  locations?: Array<{
    id: string;
    name: string;
    address: string;
    isActive: boolean;
  }>;
  subscription?: {
    id: string;
    packageId: string;
    package: Package;
    status: string;
    startDate: string;
    endDate: string;
  };
  _count?: {
    locations: number;
    staff: number;
    services: number;
    customers: number;
    bookings: number;
  };
}

export interface AdminLoginData {
  username: string;
  password: string;
}

export interface AdminAuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

class AdminApi {
  // Admin authentication
  async login(credentials: AdminLoginData): Promise<AdminAuthResponse> {
    const response = await apiClient.post<AdminAuthResponse>('/v1/admin/login', credentials);
    if (response.token) {
      apiClient.setAuthToken(response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    apiClient.setAuthToken(null);
  }

  // Merchant management
  async getMerchants(): Promise<Merchant[]> {
    const response = await apiClient.get<Merchant[]>('/v1/admin/merchants');
    return response;
  }

  async getMerchant(id: string): Promise<Merchant> {
    const response = await apiClient.get<Merchant>(`/admin/merchants/${id}`);
    return response;
  }

  async createMerchant(data: CreateMerchantData): Promise<Merchant> {
    const response = await apiClient.post<Merchant>('/v1/admin/merchants', data);
    return response;
  }

  async updateMerchant(id: string, data: Partial<CreateMerchantData>): Promise<Merchant> {
    const response = await apiClient.patch<Merchant>(`/admin/merchants/${id}`, data);
    return response;
  }

  async deleteMerchant(id: string): Promise<void> {
    await apiClient.delete(`/admin/merchants/${id}`);
  }

  // Check subdomain availability
  async checkSubdomainAvailability(subdomain: string): Promise<{ available: boolean }> {
    const response = await apiClient.get<{ available: boolean }>('/v1/admin/check-subdomain', { subdomain });
    return response;
  }

  // Check username availability
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const response = await apiClient.get<{ available: boolean }>('/v1/admin/check-username', { username });
    return response;
  }

  // Get available packages
  async getPackages(): Promise<Package[]> {
    const response = await apiClient.get<Package[]>('/v1/admin/packages');
    return response;
  }
}

export const adminApi = new AdminApi();