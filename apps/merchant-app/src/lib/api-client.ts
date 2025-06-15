import axios, { AxiosInstance } from 'axios';
import { transformApiResponse } from './db-transforms';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;

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

    // Add response interceptor to handle auth errors and transform data
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('[API Client] Response received:', {
          url: response.config.url,
          status: response.status
        });
        
        // Transform API response to handle PostgreSQL data types
        if (response.data) {
          response.data = transformApiResponse(response.data);
        }
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        console.log('[API Client] Error interceptor triggered:', {
          url: originalRequest?.url,
          status: error.response?.status,
          hasResponse: !!error.response,
          isWindowDefined: typeof window !== 'undefined',
          isRetry: originalRequest?._retry
        });

        // Only log detailed errors if they're not 404s (expected for missing endpoints)
        if (error.response?.status !== 404) {
          const errorDetails = {
            url: originalRequest?.url,
            method: originalRequest?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          };
          console.error('[API Client] API Error Details:', errorDetails);
        }
        
        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('[API Client] 401 Unauthorized detected!');
          
          // Don't attempt refresh for auth endpoints
          if (originalRequest.url?.includes('/auth/')) {
            console.log('[API Client] Auth endpoint failed, clearing tokens...');
            this.clearAuthData();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

          // Check if we have a refresh token
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            console.log('[API Client] No refresh token available, redirecting to login...');
            this.clearAuthData();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }

          // Mark this request as a retry to prevent infinite loops
          originalRequest._retry = true;

          try {
            // If we're already refreshing, wait for it
            if (this.refreshPromise) {
              console.log('[API Client] Waiting for existing refresh...');
              await this.refreshPromise;
            } else {
              console.log('[API Client] Attempting to refresh token...');
              this.refreshPromise = this.performTokenRefresh(refreshToken);
              await this.refreshPromise;
              this.refreshPromise = null;
            }

            // Retry the original request with the new token
            console.log('[API Client] Retrying original request after refresh...');
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error('[API Client] Token refresh failed:', refreshError);
            this.clearAuthData();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }
        
        console.log('[API Client] Rejecting error...');
        return Promise.reject(error);
      }
    );
  }

  // Helper method to clear auth data
  private clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('merchant');
    localStorage.removeItem('user');
  }

  // Helper method to perform token refresh
  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      // Create a new axios instance without interceptors to avoid loops
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      });

      const { token, refreshToken: newRefreshToken, user, expiresAt } = response.data;

      // Update stored tokens
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', newRefreshToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('merchant', JSON.stringify(user));
      }

      console.log('[API Client] Token refresh successful');
      
      // Schedule proactive refresh 5 minutes before expiry
      this.scheduleTokenRefresh(expiresAt);
    } catch (error) {
      console.error('[API Client] Token refresh failed:', error);
      throw error;
    }
  }

  // Schedule proactive token refresh
  private scheduleTokenRefresh(expiresAt: string) {
    // Clear any existing timeout
    if ((window as any).tokenRefreshTimeout) {
      clearTimeout((window as any).tokenRefreshTimeout);
    }

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    // Schedule refresh 5 minutes before expiry
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      console.log(`[API Client] Scheduling token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
      
      (window as any).tokenRefreshTimeout = setTimeout(async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          console.log('[API Client] Proactive token refresh triggered');
          try {
            await this.performTokenRefresh(refreshToken);
          } catch (error) {
            console.error('[API Client] Proactive refresh failed:', error);
          }
        }
      }, refreshTime);
    }
  }

  // Auth endpoints
  async login(username: string, password: string, rememberMe: boolean = false) {
    const response = await this.axiosInstance.post('/auth/merchant/login', {
      username,
      password,
    });
    
    // Normalize the response to match what the frontend expects
    const data = response.data;
    const result = {
      access_token: data.token,
      refresh_token: data.refreshToken,
      user: data.user,
      merchant: data.user, // The API returns user info that includes merchant data
      expiresAt: data.expiresAt
    };

    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('remember_me', 'true');
    } else {
      sessionStorage.setItem('session_only', 'true');
    }

    // Schedule proactive token refresh
    this.scheduleTokenRefresh(data.expiresAt);

    return result;
  }

  async verifyAction(pin: string, action: string) {
    const response = await this.axiosInstance.post('/auth/verify-action', { pin, action });
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
  async getBookings(params?: any) {
    // If a Date object is passed, convert to params object
    if (params instanceof Date) {
      params = { date: params.toISOString() };
    }
    
    // Ensure we get more bookings by default
    const requestParams = {
      limit: 1000,  // Get up to 1000 bookings
      ...params
    };
    
    const response = await this.axiosInstance.get('/bookings', { params: requestParams });
    
    // Debug pagination
    console.log('Bookings API raw response:', {
      hasData: !!response.data.data,
      dataLength: response.data.data?.length || response.data.length,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      params: params
    });
    
    // Real API returns paginated response, extract data
    const bookings = response.data.data || response.data;
    
    // Transform each booking to match the expected format
    return bookings.map((booking: any) => this.transformBooking(booking));
  }

  async getBooking(id: string) {
    const response = await this.axiosInstance.get(`/bookings/${id}`);
    const booking = response.data;
    
    // Transform the booking data to match the expected format
    return this.transformBooking(booking);
  }

  async createBooking(data: any) {
    const response = await this.axiosInstance.post('/bookings', data);
    const booking = response.data;
    
    // Transform the booking data to match the expected format
    return this.transformBooking(booking);
  }

  async updateBooking(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/bookings/${id}`, data);
    const booking = response.data;
    
    // Transform the booking data to match the expected format
    return this.transformBooking(booking);
  }
  
  // Helper method to transform booking data
  private transformBooking(booking: any) {
    // Get the first service name (for display)
    const firstService = booking.services?.[0]?.service;
    const serviceName = firstService?.name || 'Service';
    
    // Calculate total amount from services if not set
    const totalAmount = Number(booking.totalAmount) || 
      (booking.services?.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0) || 0);
    
    return {
      ...booking,
      customerName: booking.customer ? 
        `${booking.customer.firstName} ${booking.customer.lastName}`.trim() : 
        'Unknown Customer',
      customerPhone: booking.customer?.mobile || booking.customer?.phone || '',
      customerEmail: booking.customer?.email || '',
      serviceName: serviceName,
      staffName: booking.provider ? 
        `${booking.provider.firstName} ${booking.provider.lastName}`.trim() : 
        'Staff',
      price: totalAmount,
      totalAmount: totalAmount,
      duration: booking.services?.[0]?.duration || 0,
      date: booking.startTime, // For backward compatibility
    };
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
          todayRevenue: bookings.reduce((sum: number, b: any) => sum + (Number(b.totalAmount) || 0), 0),
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

  // Location endpoints
  async getLocations() {
    const response = await this.axiosInstance.get('/locations');
    return response.data;
  }

  async getLocation(id: string) {
    const response = await this.axiosInstance.get(`/locations/${id}`);
    return response.data;
  }

  async updateLocation(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/locations/${id}`, data);
    return response.data;
  }

  async updateLocationTimezone(id: string, timezone: string) {
    const response = await this.axiosInstance.patch(`/locations/${id}/timezone`, { timezone });
    return response.data;
  }

  // Generic HTTP methods
  async get(url: string, config?: any) {
    const response = await this.axiosInstance.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.axiosInstance.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.axiosInstance.put(url, data, config);
    return response.data;
  }

  async patch(url: string, data?: any, config?: any) {
    const response = await this.axiosInstance.patch(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any) {
    const response = await this.axiosInstance.delete(url, config);
    return response.data;
  }

  // Payment and Order methods
  async createOrder(data: { customerId?: string; bookingId?: string }) {
    return this.post('/payments/orders', data);
  }

  async createOrderFromBooking(bookingId: string) {
    return this.post(`/payments/orders/from-booking/${bookingId}`);
  }

  async getOrder(orderId: string) {
    return this.get(`/payments/orders/${orderId}`);
  }

  async addOrderItems(orderId: string, items: any[]) {
    return this.post(`/payments/orders/${orderId}/items`, { items });
  }

  async addOrderModifier(orderId: string, modifier: any) {
    return this.post(`/payments/orders/${orderId}/modifiers`, modifier);
  }

  async updateOrderState(orderId: string, state: string) {
    return this.post(`/payments/orders/${orderId}/state`, { state });
  }

  async processPayment(data: any) {
    return this.post('/payments/process', data);
  }

  async processSplitPayment(data: any) {
    return this.post('/payments/split', data);
  }

  async refundPayment(paymentId: string, amount: number, reason: string) {
    return this.post('/payments/refund', { paymentId, amount, reason });
  }

  async voidPayment(paymentId: string) {
    return this.post(`/payments/void/${paymentId}`);
  }

  async getPayments(params?: { page?: number; limit?: number; locationId?: string }) {
    return this.get('/payments', params);
  }

  // Merchant settings
  async getMerchantSettings() {
    try {
      return await this.get('/merchant/settings');
    } catch (error: any) {
      // Return default settings if endpoint doesn't exist
      if (error.response?.status === 404) {
        return {
          settings: {
            enableTips: true,
            defaultTipPercentages: [10, 15, 20]
          }
        };
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

// Defer token refresh initialization to not block module loading
if (typeof window !== 'undefined') {
  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleTokenCheck = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback);
    } else {
      setTimeout(callback, 1);
    }
  };
  
  scheduleTokenCheck(() => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (token && refreshToken) {
      // Check if token is about to expire
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // If token expires in less than 10 minutes, refresh immediately
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log('[API Client] Token expiring soon, refreshing on load...');
          apiClient['performTokenRefresh'](refreshToken).catch(error => {
            console.error('[API Client] Initial token refresh failed:', error);
          });
        } else {
          // Schedule refresh
          apiClient['scheduleTokenRefresh'](expiresAt.toISOString());
        }
      } catch (error) {
        console.error('[API Client] Failed to parse token:', error);
      }
    }
  });
}