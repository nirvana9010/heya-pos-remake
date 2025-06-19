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

  // Initialize auth state from stored tokens
  useEffect(() => {
    initializeAuth();
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
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Parse stored user and merchant data
      const user = userStr ? JSON.parse(userStr) : null;
      const merchant = merchantStr ? JSON.parse(merchantStr) : null;

      // Check token expiration
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();

        // If token is expired or expires in less than 5 minutes, refresh it
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
          console.log('[Auth Provider] Token expiring soon, refreshing...');
          await performTokenRefresh(refreshToken);
        } else {
          // Token is still valid
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
        console.error('[Auth Provider] Failed to parse token:', error);
        // Invalid token, clear auth data
        clearAuthData();
      }
    } catch (error) {
      console.error('[Auth Provider] Failed to initialize auth:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to initialize authentication' 
      }));
    }
  };

  const login = useCallback(async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null 
      }));

      const response: LoginResponse = await apiClient.auth.login(username, password, rememberMe);

      // Store tokens and user data
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('merchant', JSON.stringify(response.merchant));

      // Parse token expiration
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

      console.log('[Auth Provider] Login successful');
    } catch (error: any) {
      console.error('[Auth Provider] Login failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed. Please check your credentials.',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    console.log('[Auth Provider] Logging out...');
    clearAuthData();
    
    // Clear any scheduled refresh
    if ((window as any).authTokenRefreshTimeout) {
      clearTimeout((window as any).authTokenRefreshTimeout);
    }
    
    // Redirect to login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshToken = useCallback(async () => {
    const refreshTokenStr = localStorage.getItem('refresh_token');
    if (!refreshTokenStr) {
      throw new Error('No refresh token available');
    }

    await performTokenRefresh(refreshTokenStr);
  }, []);

  const performTokenRefresh = useCallback(async (refreshTokenStr: string) => {
    try {
      console.log('[Auth Provider] Performing token refresh...');
      
      const response = await apiClient.auth.refreshToken(refreshTokenStr);

      // Update stored tokens
      localStorage.setItem('access_token', response.token);
      localStorage.setItem('refresh_token', response.refreshToken);
      
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

      console.log('[Auth Provider] Token refresh successful');
    } catch (error) {
      console.error('[Auth Provider] Token refresh failed:', error);
      // Refresh failed, logout user
      logout();
      throw error;
    }
  }, [logout]);

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
      console.log(`[Auth Provider] Scheduling token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
      
      (window as any).authTokenRefreshTimeout = setTimeout(async () => {
        const refreshTokenStr = localStorage.getItem('refresh_token');
        if (refreshTokenStr) {
          try {
            await performTokenRefresh(refreshTokenStr);
          } catch (error) {
            console.error('[Auth Provider] Scheduled refresh failed:', error);
          }
        }
      }, refreshTime);
    }
  };

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('merchant');
    localStorage.removeItem('remember_me');
    sessionStorage.removeItem('session_only');

    setAuthState({
      user: null,
      merchant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tokenExpiresAt: null,
    });
  }, []);

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