import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('[API Client] Response received:', {
          url: response.config.url,
          status: response.status
        });
        return response;
      },
      (error) => {
        console.log('[API Client] Error interceptor triggered:', {
          url: error.config?.url,
          status: error.response?.status,
          hasResponse: !!error.response,
          isWindowDefined: typeof window !== 'undefined'
        });

        // Only log detailed errors if they're not 404s (expected for missing endpoints)
        if (error.response?.status !== 404) {
          const errorDetails = {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          };
          console.error('[API Client] API Error Details:', errorDetails);
        }
        
        if (error.response?.status === 401) {
          console.log('[API Client] 401 Unauthorized detected!');
          console.log('[API Client] Current URL:', window.location.href);
          console.log('[API Client] Clearing tokens...');
          
          // Token expired or invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('merchant');
          localStorage.removeItem('user');
          
          console.log('[API Client] Tokens cleared, attempting redirect...');
          
          // Try multiple redirect methods
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            console.log('[API Client] Window is defined, redirecting to /login');
            
            // Use immediate redirect
            window.location.href = '/login';
            
            // Return a rejected promise with a specific error to prevent further processing
            return Promise.reject(new Error('UNAUTHORIZED_REDIRECT'));
          }
        }
        
        console.log('[API Client] Rejecting error...');
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.axiosInstance.post('/auth/merchant/login', {
      username,
      password,
    });
    
    // Normalize the response to match what the frontend expects
    const data = response.data;
    return {
      access_token: data.token,
      refresh_token: data.refreshToken,
      user: data.user,
      merchant: data.user, // The API returns user info that includes merchant data
      expiresAt: data.expiresAt
    };
  }

  async verifyPin(pin: string) {
    const response = await this.axiosInstance.post('/auth/staff/verify-pin', { pin });
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.axiosInstance.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  // Services endpoints
  async getServices() {
    const response = await this.axiosInstance.get('/services');
    // Real API returns paginated response, extract data
    return response.data.data || response.data;
  }

  async getCategories() {
    const response = await this.axiosInstance.get('/service-categories');
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.axiosInstance.post('/service-categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/service-categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string) {
    const response = await this.axiosInstance.delete(`/service-categories/${id}`);
    return response.data;
  }

  async createService(data: any) {
    const response = await this.axiosInstance.post('/services', data);
    return response.data;
  }

  async updateService(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/services/${id}`, data);
    return response.data;
  }

  async deleteService(id: string) {
    const response = await this.axiosInstance.delete(`/services/${id}`);
    return response.data;
  }

  // Customers endpoints
  async getCustomers() {
    const response = await this.axiosInstance.get('/customers');
    // Real API returns paginated response, extract data
    return response.data.data || response.data;
  }

  async createCustomer(data: any) {
    const response = await this.axiosInstance.post('/customers', data);
    return response.data;
  }

  async updateCustomer(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/customers/${id}`, data);
    return response.data;
  }

  // Bookings endpoints
  async getBookings(date?: Date) {
    const params = date ? { date: date.toISOString() } : {};
    const response = await this.axiosInstance.get('/bookings', { params });
    // Real API returns paginated response, extract data
    return response.data.data || response.data;
  }

  async getBooking(id: string) {
    const response = await this.axiosInstance.get(`/bookings/${id}`);
    return response.data;
  }

  async createBooking(data: any) {
    const response = await this.axiosInstance.post('/bookings', data);
    return response.data;
  }

  async updateBooking(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/bookings/${id}`, data);
    return response.data;
  }

  async updateBookingStatus(id: string, status: string) {
    const response = await this.axiosInstance.patch(`/bookings/${id}/status`, { status });
    return response.data;
  }

  async checkAvailability(date: Date, serviceId: string, staffId?: string) {
    const response = await this.axiosInstance.post('/bookings/check-availability', {
      date: date.toISOString(),
      serviceId,
      staffId,
    });
    return response.data;
  }

  // Staff endpoints
  async getStaff() {
    const response = await this.axiosInstance.get('/staff');
    return response.data;
  }

  async createStaff(data: any) {
    const response = await this.axiosInstance.post('/staff', data);
    return response.data;
  }

  async updateStaff(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/staff/${id}`, data);
    return response.data;
  }

  async deleteStaff(id: string) {
    const response = await this.axiosInstance.delete(`/staff/${id}`);
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardStats() {
    try {
      const response = await this.axiosInstance.get('/dashboard/stats');
      return response.data;
    } catch (error: any) {
      // If dashboard endpoint doesn't exist, return calculated stats
      if (error.response?.status === 404) {
        console.log('Dashboard endpoint not found, calculating stats from available data');
        
        // Get today's bookings
        const today = new Date();
        const bookings = await this.getBookings(today);
        
        // Calculate basic stats
        return {
          todayBookings: bookings.length,
          todayRevenue: bookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0),
          newCustomers: 0, // Would need customers endpoint with date filter
          pendingBookings: bookings.filter((b: any) => b.status === 'PENDING').length,
          bookingGrowth: 0,
          revenueGrowth: 0,
          customerGrowth: 0
        };
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient();