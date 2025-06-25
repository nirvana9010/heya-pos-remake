import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { transformApiResponse } from '../db-transforms';
import { validateRequest, validateResponse, ApiValidationError } from './validation';
import { memoryCache, generateCacheKey, shouldCacheData, getCacheConfig } from '../cache-config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  data?: any;
  originalError?: any;
}

export class BaseApiClient {
  protected axiosInstance: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Check if redirect is in progress
        if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
          return Promise.reject(new Error('UNAUTHORIZED_REDIRECT'));
        }
        
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for data transformation and auth errors
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Transform API response to handle PostgreSQL data types
        if (response.data) {
          response.data = transformApiResponse(response.data);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Log errors (but not 404s as they're expected)
        const shouldLog = error.response?.status !== 404;
                         
        if (shouldLog) {
          const errorInfo = {
            url: originalRequest?.url,
            method: originalRequest?.method?.toUpperCase(),
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            errorCode: error.response?.data?.errorCode,
            details: error.response?.data,
            requestData: originalRequest?.data
          };
          
          // Log with full details for debugging
          console.error('[API Error]', JSON.stringify(errorInfo, null, 2));
          
          // Also log the raw error for additional context
          if (error.response?.data) {
            console.error('[API Error Details]', error.response.data);
          }
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          return this.handleAuthError(error, originalRequest);
        }

        // Handle 403 errors - likely corrupted auth state
        if (error.response?.status === 403 && !originalRequest._retry) {
          console.warn('[BaseClient] 403 Forbidden - auth state may be corrupted, clearing and redirecting to login');
          this.clearAuthData();
          this.redirectToLogin();
          return Promise.reject(error);
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  private async handleAuthError(error: any, originalRequest: any) {
    // Don't attempt refresh for auth endpoints
    if (originalRequest.url?.includes('/auth/')) {
      this.clearAuthData();
      this.redirectToLogin();
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.clearAuthData();
      this.redirectToLogin();
      return Promise.reject(error);
    }

    // Mark request as retry to prevent infinite loops
    originalRequest._retry = true;

    try {
      // If already refreshing, wait for it
      if (this.refreshPromise) {
        await this.refreshPromise;
      } else {
        this.refreshPromise = this.performTokenRefresh(refreshToken);
        await this.refreshPromise;
        this.refreshPromise = null;
      }

      // Retry original request
      return this.axiosInstance(originalRequest);
    } catch (refreshError) {
      this.clearAuthData();
      this.redirectToLogin();
      return Promise.reject(refreshError);
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      // Create new axios instance to avoid interceptor loops
      const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
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

      this.scheduleTokenRefresh(expiresAt);
    } catch (error) {
      throw error;
    }
  }

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
      
      (window as any).tokenRefreshTimeout = setTimeout(async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            await this.performTokenRefresh(refreshToken);
          } catch (error) {
          }
        }
      }, refreshTime);
    }
  }

  private clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('merchant');
    localStorage.removeItem('user');
    
    // Clear the auth cookie with the same settings used when setting it
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
  }

  private redirectToLogin() {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // Set a flag to prevent further API calls
      (window as any).__AUTH_REDIRECT_IN_PROGRESS__ = true;
      
      // Use replace to prevent back button issues and redirect immediately
      window.location.replace('/login');
      
      // Throw a special error to stop execution
      throw new Error('UNAUTHORIZED_REDIRECT');
    }
  }

  private transformError(error: any): ApiError {
    // Handle validation errors specifically
    if (error instanceof ApiValidationError) {
      return {
        message: `Validation Error: ${error.message}`,
        code: 'VALIDATION_ERROR',
      };
    }

    if (error.response) {
      return {
        message: error.response.data?.message || error.message,
        status: error.response.status,
        code: error.response.data?.code || error.response.data?.errorCode,
        data: error.response.data,
        originalError: error
      };
    }
    
    return {
      message: error.message || 'An unexpected error occurred',
      originalError: error
    };
  }

  // Helper method to add version prefix to URLs
  protected addVersionPrefix(url: string, defaultVersion: 'v1' | 'v2' = 'v1'): string {
    // Don't add version if already present or if it's an external URL
    if (url.startsWith('/v1/') || url.startsWith('/v2/') || url.startsWith('http')) {
      return url;
    }
    
    // Ensure URL starts with /
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    // Add version prefix  
    return `/${defaultVersion}${cleanUrl}`;
  }

  // Generic HTTP methods with version handling and optional validation
  protected async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig, 
    version?: 'v1' | 'v2',
    responseSchema?: Record<string, (value: any, field: string) => any>
  ): Promise<T> {
    const versionedUrl = this.addVersionPrefix(url, version);
    const cacheKey = generateCacheKey(versionedUrl, config?.params);
    
    // Check cache first
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      if (!cached.isStale) {
        return cached.data;
      }
      
      // Stale-while-revalidate: return stale data and fetch in background
      this.revalidateInBackground(versionedUrl, config, version, responseSchema, cacheKey);
      return cached.data;
    }
    
    // Fetch from network
    const response = await this.axiosInstance.get(versionedUrl, config);
    
    // Validate response if schema provided
    let data = response.data;
    if (responseSchema && process.env.NODE_ENV === 'development') {
      data = validateResponse(response.data, responseSchema, url);
    }
    
    // Cache if appropriate
    if (shouldCacheData(url, data)) {
      memoryCache.set(cacheKey, data);
    }
    
    return data;
  }
  
  private async revalidateInBackground(
    url: string,
    config: AxiosRequestConfig | undefined,
    version: 'v1' | 'v2' | undefined,
    responseSchema: Record<string, (value: any, field: string) => any> | undefined,
    cacheKey: string
  ) {
    try {
      const response = await this.axiosInstance.get(url, config);
      let data = response.data;
      
      if (responseSchema && process.env.NODE_ENV === 'development') {
        data = validateResponse(response.data, responseSchema, url);
      }
      
      if (shouldCacheData(url, data)) {
        memoryCache.set(cacheKey, data);
      }
    } catch (error) {
      // Ignore errors in background revalidation
    }
  }

  protected async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig, 
    version?: 'v1' | 'v2',
    requestSchema?: Record<string, (value: any, field: string) => any>,
    responseSchema?: Record<string, (value: any, field: string) => any>
  ): Promise<T> {
    // Validate request if schema provided
    if (requestSchema && data) {
      validateRequest(data, requestSchema, url);
    }

    const response = await this.axiosInstance.post(this.addVersionPrefix(url, version), data, config);
    
    // Invalidate related cache on mutations
    this.invalidateCacheForMutation(url);
    
    // Validate response if schema provided
    if (responseSchema && process.env.NODE_ENV === 'development') {
      return validateResponse(response.data, responseSchema, url);
    }
    
    return response.data;
  }

  protected async put<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig, 
    version?: 'v1' | 'v2',
    requestSchema?: Record<string, (value: any, field: string) => any>,
    responseSchema?: Record<string, (value: any, field: string) => any>
  ): Promise<T> {
    // Validate request if schema provided
    if (requestSchema && data) {
      validateRequest(data, requestSchema, url);
    }

    const response = await this.axiosInstance.put(this.addVersionPrefix(url, version), data, config);
    
    // Invalidate related cache on mutations
    this.invalidateCacheForMutation(url);
    
    // Validate response if schema provided
    if (responseSchema && process.env.NODE_ENV === 'development') {
      return validateResponse(response.data, responseSchema, url);
    }
    
    return response.data;
  }

  protected async patch<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig, 
    version?: 'v1' | 'v2',
    requestSchema?: Record<string, (value: any, field: string) => any>,
    responseSchema?: Record<string, (value: any, field: string) => any>
  ): Promise<T> {
    // Validate request if schema provided
    if (requestSchema && data) {
      validateRequest(data, requestSchema, url);
    }

    const response = await this.axiosInstance.patch(this.addVersionPrefix(url, version), data, config);
    
    // Invalidate related cache on mutations
    this.invalidateCacheForMutation(url);
    
    // Validate response if schema provided
    if (responseSchema && process.env.NODE_ENV === 'development') {
      return validateResponse(response.data, responseSchema, url);
    }
    
    return response.data;
  }

  protected async delete<T = any>(
    url: string, 
    config?: AxiosRequestConfig, 
    version?: 'v1' | 'v2',
    responseSchema?: Record<string, (value: any, field: string) => any>
  ): Promise<T> {
    const response = await this.axiosInstance.delete(this.addVersionPrefix(url, version), config);
    
    // Invalidate related cache on mutations
    this.invalidateCacheForMutation(url);
    
    // Validate response if schema provided
    if (responseSchema && process.env.NODE_ENV === 'development') {
      return validateResponse(response.data, responseSchema, url);
    }
    
    return response.data;
  }
  
  // Cache management methods
  protected invalidateCache(pattern: string) {
    memoryCache.delete(pattern);
  }
  
  protected clearAllCache() {
    memoryCache.clear();
  }
  
  private invalidateCacheForMutation(url: string) {
    // Extract the resource type from URL
    const segments = url.split('/').filter(Boolean);
    if (segments.length > 0) {
      // Invalidate all cache entries for this resource type
      const resourceType = segments[0];
      this.invalidateCache(resourceType);
      
      // Also invalidate dashboard stats if it's a booking or payment
      if (['bookings', 'payments'].includes(resourceType)) {
        this.invalidateCache('dashboard');
        this.invalidateCache('reports');
      }
    }
  }
}