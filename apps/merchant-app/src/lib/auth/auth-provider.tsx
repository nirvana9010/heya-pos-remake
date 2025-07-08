'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiClient } from '../api-client';
import type { LoginResponse } from '../clients/auth-client';

export interface User {
  id: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  subdomain: string;
  settings?: {
    showUnassignedColumn?: boolean;
    allowUnassignedBookings?: boolean;
    calendarStartHour?: number;
    calendarEndHour?: number;
    [key: string]: any;
  };
}

export interface AuthState {
  user: User | null;
  merchant: Merchant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenExpiresAt: Date | null;
}

export interface AuthActions {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshToken: () => Promise<void>;
  verifyAction: (pin: string, action: string) => Promise<any>;
}

export type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Centralized Authentication Provider - Phase 2 Refactoring
 * 
 * This provider consolidates all authentication logic in one place,
 * replacing the fragmented auth handling throughout the application.
 * 
 * Features:
 * - Automatic token refresh
 * - Persistent session management
 * - Centralized auth state
 * - Error handling
 * - Loading states
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    merchant: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    tokenExpiresAt: null,
  });

  // Define clearAuthData early so it can be used in initializeAuth
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('merchant');
    localStorage.removeItem('remember_me');
    sessionStorage.removeItem('session_only');

    // Clear auth cookie
    // Clear auth cookie with same settings as when setting
    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookieOptions = [
      'authToken=',
      'path=/',
      'expires=Thu, 01 Jan 1970 00:00:00 UTC',
      'SameSite=Lax',
      isProduction ? 'Secure' : '',
    ].filter(Boolean).join('; ');
    
    document.cookie = clearCookieOptions;

    setAuthState({
      user: null,
      merchant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tokenExpiresAt: null,
    });
  }, []);

  // Initialize auth state from stored tokens
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for unauthorized events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('[AuthProvider] Received unauthorized event, clearing auth');
      clearAuthData();
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        merchant: null,
        tokenExpiresAt: null,
        error: 'Session expired. Please login again.'
      }));
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (authState.isAuthenticated && authState.tokenExpiresAt) {
      scheduleTokenRefresh(authState.tokenExpiresAt);
    }
    return () => {
      if ((window as any).authTokenRefreshTimeout) {
        clearTimeout((window as any).authTokenRefreshTimeout);
      }
    };
  }, [authState.isAuthenticated, authState.tokenExpiresAt]);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const userStr = localStorage.getItem('user');
      const merchantStr = localStorage.getItem('merchant');

      if (!token || !refreshToken) {
        // If no localStorage tokens, also clear any stale cookies to prevent redirect loops
        const cookiesToClear = ['authToken', 'auth-token'];
        cookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict`;
        });
        
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Parse stored user and merchant data
      let user = null;
      let merchant = null;
      
      try {
        user = userStr ? JSON.parse(userStr) : null;
        merchant = merchantStr ? JSON.parse(merchantStr) : null;
        
        // Validate that we have BOTH user and merchant data
        if (!user || !user.id || !user.email) {
          console.warn('[Auth Provider] Missing or invalid user data, clearing auth');
          clearAuthData();
          return;
        }
        
        if (!merchant || !merchant.id || !merchant.name) {
          console.warn('[Auth Provider] Missing or invalid merchant data, clearing auth');
          clearAuthData();
          return;
        }
        
        // If merchant doesn't have settings, try to fetch them
        if (!merchant.settings) {
          try {
            const fullMerchant = await apiClient.get('/merchant/profile');
            merchant = {
              ...merchant,
              settings: fullMerchant.settings
            };
            // Update localStorage with the full merchant data
            localStorage.setItem('merchant', JSON.stringify(merchant));
          } catch (error) {
            console.warn('[Auth Provider] Failed to fetch merchant settings:', error);
            // Continue with merchant data without settings
          }
        }
      } catch (e) {
        console.error('[Auth Provider] Failed to parse stored auth data', e);
        clearAuthData();
        return;
      }

      // Check token expiration
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();

        // Check if token is already expired
        if (expiresAt < now) {
          clearAuthData();
          return;
        }
        
        // If token expires in less than 5 minutes, refresh it
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
          try {
            await performTokenRefresh(refreshToken);
          } catch (error) {
            clearAuthData();
            return;
          }
        } else {
          // Token is still valid
          // Ensure cookie is also set for middleware
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 1); // 1 day default
          document.cookie = `authToken=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
          
          setAuthState(prev => ({
            ...prev,
            user,
            merchant,
            isAuthenticated: true,
            isLoading: false,
            tokenExpiresAt: expiresAt,
          }));
        }
      } catch (error) {
        // Invalid token, clear auth data
        clearAuthData();
      }
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to initialize authentication' 
      }));
    }
  };

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null 
      }));

      const response: LoginResponse = await apiClient.auth.login(email, password, rememberMe);

      // Store tokens and user data
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Fetch full merchant data with settings
      try {
        const fullMerchant = await apiClient.get('/merchant/profile');
        const merchantWithSettings = {
          ...response.merchant,
          settings: fullMerchant.settings
        };
        localStorage.setItem('merchant', JSON.stringify(merchantWithSettings));
        
        // Also set a cookie for middleware to check (httpOnly would be better but requires server-side)
        const expiryDays = rememberMe ? 30 : 1;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        // Set cookie with proper domain for production
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = [
          `authToken=${response.access_token}`,
          'path=/',
          `expires=${expiryDate.toUTCString()}`,
          'SameSite=Lax', // Changed from Strict to Lax for better redirect handling
          isProduction ? 'Secure' : '', // Secure flag for HTTPS in production
        ].filter(Boolean).join('; ');
        
        document.cookie = cookieOptions;

        // Parse token expiration
        const payload = JSON.parse(atob(response.access_token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);

        setAuthState(prev => ({
          ...prev,
          user: response.user,
          merchant: merchantWithSettings,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenExpiresAt: expiresAt,
        }));
      } catch (settingsError) {
        console.error('Failed to fetch merchant settings:', settingsError);
        // Continue with basic merchant data if settings fetch fails
        localStorage.setItem('merchant', JSON.stringify(response.merchant));
        
        // Also set a cookie for middleware to check
        const expiryDays = rememberMe ? 30 : 1;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = [
          `authToken=${response.access_token}`,
          'path=/',
          `expires=${expiryDate.toUTCString()}`,
          'SameSite=Lax',
          isProduction ? 'Secure' : '',
        ].filter(Boolean).join('; ');
        
        document.cookie = cookieOptions;

        const payload = JSON.parse(atob(response.access_token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);

        setAuthState(prev => ({
          ...prev,
          user: response.user,
          merchant: response.merchant,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenExpiresAt: expiresAt,
        }));
      }

    } catch (error: any) {
      // Extract the actual error message from the API response
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && error.message !== 'Request failed with status code 401') {
        errorMessage = error.message;
      }
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // clearAuthData is now defined at the top of the component

  const logout = useCallback(() => {
    
    // Clear any scheduled refresh first
    if ((window as any).authTokenRefreshTimeout) {
      clearTimeout((window as any).authTokenRefreshTimeout);
    }
    
    // Clear auth data (this updates state and localStorage)
    clearAuthData();
    
    // Force clear all possible cookie variations to ensure middleware doesn't find them
    const cookiesToClear = ['authToken', 'auth-token'];
    const domains = [window.location.hostname, `.${window.location.hostname}`, ''];
    const paths = ['/', '/apps', '/apps/merchant-app'];
    
    cookiesToClear.forEach(cookieName => {
      domains.forEach(domain => {
        paths.forEach(path => {
          // Clear with different combinations
          document.cookie = `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict${domain ? `; domain=${domain}` : ''}`;
          document.cookie = `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 UTC${domain ? `; domain=${domain}` : ''}`;
        });
      });
    });
    
    // Use router.replace instead of window.location to ensure React state is preserved
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // Small delay to ensure cookies are cleared before navigation
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  }, [clearAuthData]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const performTokenRefresh = useCallback(async (refreshTokenStr: string) => {
    try {
      
      const response = await apiClient.auth.refreshToken(refreshTokenStr);

      // Update stored tokens
      localStorage.setItem('access_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);
      
      // Update auth cookie
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 1); // 1 day default
      document.cookie = `authToken=${response.token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
      
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('merchant', JSON.stringify(response.user));
      }

      // Parse new token expiration
      const payload = JSON.parse(atob(response.token.split('.')[1]));
      const expiresAt = new Date(payload.exp * 1000);

      setAuthState(prev => ({
        ...prev,
        tokenExpiresAt: expiresAt,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      // Don't call logout here to avoid circular dependency
      // Instead, clear auth data and redirect
      clearAuthData();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw error;
    }
  }, [clearAuthData]);

  const refreshToken = useCallback(async () => {
    const refreshTokenStr = localStorage.getItem('refresh_token');
    if (!refreshTokenStr) {
      throw new Error('No refresh token available');
    }

    await performTokenRefresh(refreshTokenStr);
  }, [performTokenRefresh]);

  const scheduleTokenRefresh = (expiresAt: Date) => {
    // Clear any existing timeout
    if ((window as any).authTokenRefreshTimeout) {
      clearTimeout((window as any).authTokenRefreshTimeout);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt.getTime() - now;
    
    // Schedule refresh 5 minutes before expiry
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      
      (window as any).authTokenRefreshTimeout = setTimeout(async () => {
        const refreshTokenStr = localStorage.getItem('refresh_token');
        if (refreshTokenStr) {
          try {
            await performTokenRefresh(refreshTokenStr);
          } catch (error) {
          }
        }
      }, refreshTime);
    }
  };


  const verifyAction = useCallback(async (pin: string, action: string) => {
    return apiClient.auth.verifyAction(pin, action);
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    clearError,
    refreshToken,
    verifyAction,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user has specific permissions
export function usePermissions() {
  const { user } = useAuth();
  
  return {
    canManageStaff: user?.role === 'admin' || user?.role === 'manager',
    canManageServices: user?.role === 'admin' || user?.role === 'manager',
    canViewReports: user?.role === 'admin' || user?.role === 'manager',
    canProcessPayments: true, // All authenticated users can process payments
    canManageBookings: true, // All authenticated users can manage bookings
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'staff',
  };
}

// Hook for auth-dependent data fetching
export function useAuthenticatedApi() {
  const { isAuthenticated, isLoading } = useAuth();
  
  return {
    isReady: isAuthenticated && !isLoading,
    shouldFetch: isAuthenticated && !isLoading,
  };
}