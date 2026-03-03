"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { apiClient } from "../api-client";
import type { LoginResponse } from "../clients/auth-client";

export type UserType = "merchant" | "merchant_user" | "staff";

export interface User {
  id: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  type?: UserType;
  permissions?: string[];
  merchantUserId?: string;
  staffId?: string;
}

export interface Location {
  id: string;
  name: string;
  merchantId: string;
  address?: string;
  timezone?: string;
  isActive: boolean;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  subdomain: string;
  locations?: Location[];
  locationId?: string; // Legacy field for backward compatibility
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
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshToken: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  verifyAction: (pin: string, action: string) => Promise<any>;
  refreshMerchantData: () => Promise<void>;
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
    // Clear localStorage (tokens kept during rollout, user/merchant always)
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("merchant");
    localStorage.removeItem("remember_me");
    sessionStorage.removeItem("session_only");

    // CRITICAL: Clear the memory cache to prevent serving stale merchant data
    if (typeof window !== "undefined" && (window as any).memoryCache) {
      (window as any).memoryCache.clear();
    }

    import("@/lib/cache-config")
      .then(({ memoryCache }) => {
        memoryCache.clear();
      })
      .catch(() => {});

    // Note: httpOnly cookies are cleared server-side on logout.
    // Clear the JS-readable middleware cookie and legacy authToken cookie
    document.cookie =
      "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

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
      console.log("[AuthProvider] Received unauthorized event, clearing auth");
      clearAuthData();
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        merchant: null,
        tokenExpiresAt: null,
        error: "Session expired. Please login again.",
      }));
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
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
      const userStr = localStorage.getItem("user");
      const merchantStr = localStorage.getItem("merchant");
      const token = localStorage.getItem("access_token"); // May or may not exist with cookie auth

      // Check if we have stored user data (with cookie auth, tokens may be httpOnly)
      if (!userStr && !token) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Parse stored user and merchant data
      let user = null;
      let merchant = null;

      try {
        user = userStr ? JSON.parse(userStr) : null;
        merchant = merchantStr ? JSON.parse(merchantStr) : null;

        // Validate that we have user data
        if (!user || !user.id || !user.email) {
          console.warn(
            "[Auth Provider] Missing or invalid user data, clearing auth",
          );
          clearAuthData();
          return;
        }

        if (!merchant || !merchant.id || !merchant.name) {
          console.warn(
            "[Auth Provider] Missing or invalid merchant data, clearing auth",
          );
          clearAuthData();
          return;
        }

        // If merchant doesn't have settings, try to fetch them
        if (!merchant.settings) {
          try {
            const fullMerchant = await apiClient.get("/merchant/profile");
            merchant = {
              ...merchant,
              settings: fullMerchant.settings,
            };
            localStorage.setItem("merchant", JSON.stringify(merchant));
          } catch (error) {
            console.warn(
              "[Auth Provider] Failed to fetch merchant settings:",
              error,
            );
          }
        }
      } catch (e) {
        console.error("[Auth Provider] Failed to parse stored auth data", e);
        clearAuthData();
        return;
      }

      // If we have a localStorage token, check its expiration
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const expiresAt = new Date(payload.exp * 1000);
          const now = new Date();

          if (expiresAt < now) {
            // Token expired — try refresh (cookie may still work)
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
              try {
                await performTokenRefresh(refreshToken);
                return;
              } catch {
                clearAuthData();
                return;
              }
            }
            clearAuthData();
            return;
          }

          if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
              try {
                await performTokenRefresh(refreshToken);
                return;
              } catch {
                clearAuthData();
                return;
              }
            }
          }

          setAuthState((prev) => ({
            ...prev,
            user,
            merchant,
            isAuthenticated: true,
            isLoading: false,
            tokenExpiresAt: expiresAt,
          }));
        } catch {
          clearAuthData();
        }
      } else {
        // No localStorage token — validate session via /auth/me (httpOnly cookie)
        try {
          const meResponse = await apiClient.auth.getMe();
          if (meResponse) {
            setAuthState((prev) => ({
              ...prev,
              user,
              merchant,
              isAuthenticated: true,
              isLoading: false,
            }));
          }
        } catch {
          clearAuthData();
        }
      }
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to initialize authentication",
      }));
    }
  };

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      try {
        setAuthState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        const response: LoginResponse = await apiClient.auth.login(
          email,
          password,
          rememberMe,
        );

        // CRITICAL: Clear any existing cached data before setting new auth
        // This prevents serving stale data from previous logins
        import("@/lib/cache-config")
          .then(({ memoryCache }) => {
            memoryCache.clear();
          })
          .catch(() => {
            // Ignore errors if module not found
          });

        // Store tokens in localStorage during rollout (API also sets httpOnly cookies).
        // Once RETURN_TOKENS_IN_BODY=false, these fields won't be in the response.
        if (response.access_token) {
          localStorage.setItem("access_token", response.access_token);
          // Set a JS-readable cookie for Next.js middleware (middleware can't read localStorage).
          // The API also sets an httpOnly cookie for API calls, but the rewrite proxy
          // may not reliably forward Set-Cookie headers. This ensures middleware works.
          document.cookie = `access_token=${response.access_token}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
        }
        if (response.refresh_token) {
          localStorage.setItem("refresh_token", response.refresh_token);
        }
        localStorage.setItem("user", JSON.stringify(response.user));

        // Fetch full merchant data with settings
        let merchantData = response.merchant;
        try {
          const fullMerchant = await apiClient.get("/merchant/profile");
          merchantData = {
            ...response.merchant,
            settings: fullMerchant.settings,
          };
        } catch (settingsError) {
          console.error("Failed to fetch merchant settings:", settingsError);
        }
        localStorage.setItem("merchant", JSON.stringify(merchantData));

        // Parse token expiration (from localStorage token or response)
        let expiresAt: Date | null = null;
        const tokenForExpiry =
          response.access_token || localStorage.getItem("access_token");
        if (tokenForExpiry) {
          try {
            const payload = JSON.parse(atob(tokenForExpiry.split(".")[1]));
            expiresAt = new Date(payload.exp * 1000);
          } catch {
            // Ignore parse errors
          }
        }

        console.log("[Auth] Login successful:", {
          userType: response.user.type,
          permissions: response.user.permissions,
          isOwner:
            response.user.type === "merchant" ||
            response.user.permissions?.includes("*"),
          email: response.user.email,
          cookieAuth: !response.access_token,
        });

        setAuthState((prev) => ({
          ...prev,
          user: response.user,
          merchant: merchantData,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenExpiresAt: expiresAt,
        }));
      } catch (error: any) {
        // Extract the actual error message from the API response
        let errorMessage = "Login failed. Please check your credentials.";

        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (
          error.message &&
          error.message !== "Request failed with status code 401"
        ) {
          errorMessage = error.message;
        }

        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [],
  );

  // clearAuthData is now defined at the top of the component

  const logout = useCallback(async () => {
    // Clear any scheduled refresh first
    if ((window as any).authTokenRefreshTimeout) {
      clearTimeout((window as any).authTokenRefreshTimeout);
    }

    // Call server logout to clear httpOnly cookies and invalidate session
    try {
      await apiClient.auth.logout();
    } catch {
      // Proceed with client-side cleanup even if server call fails
    }

    // Clear client-side auth data (localStorage, state)
    clearAuthData();

    // Clear legacy cookies
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/login")
    ) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  }, [clearAuthData]);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const performTokenRefresh = useCallback(
    async (refreshTokenStr: string | null) => {
      try {
        const response = await apiClient.auth.refreshToken(
          refreshTokenStr || "",
        );

        // Store tokens in localStorage during rollout (API also sets httpOnly cookies)
        if (response.token) {
          localStorage.setItem("access_token", response.token);
          // Keep middleware cookie in sync
          document.cookie = `access_token=${response.token}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
        }
        if (response.refreshToken) {
          localStorage.setItem("refresh_token", response.refreshToken);
        }

        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
        }

        if (response.merchant) {
          localStorage.setItem("merchant", JSON.stringify(response.merchant));
          setAuthState((prev) => ({
            ...prev,
            merchant: response.merchant,
          }));
        }

        // Parse new token expiration
        let expiresAt: Date | null = null;
        const tokenForExpiry =
          response.token || localStorage.getItem("access_token");
        if (tokenForExpiry) {
          try {
            const payload = JSON.parse(atob(tokenForExpiry.split(".")[1]));
            expiresAt = new Date(payload.exp * 1000);
          } catch {
            // Ignore parse errors
          }
        }

        setAuthState((prev) => ({
          ...prev,
          tokenExpiresAt: expiresAt,
          isLoading: false,
        }));

        return true;
      } catch (error) {
        clearAuthData();
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.href = "/login";
        }
        throw error;
      }
    },
    [clearAuthData],
  );

  const refreshToken = useCallback(async () => {
    const refreshTokenStr = localStorage.getItem("refresh_token");
    if (!refreshTokenStr) {
      throw new Error("No refresh token available");
    }

    await performTokenRefresh(refreshTokenStr);
  }, [performTokenRefresh]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshTokenStr = localStorage.getItem("refresh_token");
    if (!refreshTokenStr) {
      console.error("[Auth] No refresh token available");
      return null;
    }

    try {
      await performTokenRefresh(refreshTokenStr);
      // Return the new access token
      return localStorage.getItem("access_token");
    } catch (error) {
      console.error("[Auth] Failed to refresh access token:", error);
      return null;
    }
  }, [performTokenRefresh]);

  const scheduleTokenRefresh = (expiresAt: Date) => {
    // Clear any existing timeout
    if ((window as any).authTokenRefreshTimeout) {
      clearTimeout((window as any).authTokenRefreshTimeout);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt.getTime() - now;

    // Determine refresh timing based on token lifetime
    let refreshBeforeExpiry: number;

    if (timeUntilExpiry > 24 * 60 * 60 * 1000) {
      // Token expires in more than 24 hours (e.g., 7-day token)
      // Refresh 1 hour before expiry to prevent WebSocket disconnections
      refreshBeforeExpiry = 60 * 60 * 1000; // 1 hour
      console.log(
        "[Auth] Long-lived token detected, will refresh 1 hour before expiry",
      );
    } else if (timeUntilExpiry > 60 * 60 * 1000) {
      // Token expires in 1-24 hours
      // Refresh 5 minutes before expiry
      refreshBeforeExpiry = 5 * 60 * 1000; // 5 minutes
      console.log(
        "[Auth] Medium-lived token detected, will refresh 5 minutes before expiry",
      );
    } else {
      // Token expires in less than 1 hour (e.g., 15-30 minute tokens)
      // Refresh 1 minute before expiry
      refreshBeforeExpiry = 60 * 1000; // 1 minute
      console.log(
        "[Auth] Short-lived token detected, will refresh 1 minute before expiry",
      );
    }

    const refreshTime = timeUntilExpiry - refreshBeforeExpiry;

    if (refreshTime > 0) {
      const refreshDate = new Date(Date.now() + refreshTime);
      console.log(
        `[Auth] Token expires at ${expiresAt.toISOString()}, scheduling refresh for ${refreshDate.toISOString()}`,
      );

      (window as any).authTokenRefreshTimeout = setTimeout(async () => {
        console.log("[Auth] Proactively refreshing token before expiry");
        const refreshTokenStr = localStorage.getItem("refresh_token");
        if (refreshTokenStr) {
          try {
            await performTokenRefresh(refreshTokenStr);
            console.log("[Auth] Token refreshed successfully");

            // Emit event so WebSocket can update if needed
            window.dispatchEvent(new CustomEvent("auth:tokenRefreshed"));
          } catch (error) {
            console.error("[Auth] Failed to refresh token:", error);
          }
        }
      }, refreshTime);
    } else {
      // Token is about to expire or already expired, refresh immediately
      console.log("[Auth] Token expiring soon, refreshing immediately");
      const refreshTokenStr = localStorage.getItem("refresh_token");
      if (refreshTokenStr) {
        performTokenRefresh(refreshTokenStr).catch((error) => {
          console.error("[Auth] Failed to refresh token:", error);
        });
      }
    }
  };

  const verifyAction = useCallback(async (pin: string, action: string) => {
    return apiClient.auth.verifyAction(pin, action);
  }, []);

  const refreshMerchantData = useCallback(async () => {
    try {
      const response = await apiClient.get("/merchant/profile");
      if (response) {
        // Update both state and localStorage
        localStorage.setItem("merchant", JSON.stringify(response));
        setAuthState((prev) => ({
          ...prev,
          merchant: response,
        }));

        // Dispatch custom event for other components
        window.dispatchEvent(
          new CustomEvent("merchantDataRefreshed", {
            detail: { merchant: response },
          }),
        );
      }
    } catch (error) {
      console.error("[Auth Provider] Failed to refresh merchant data:", error);
    }
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    clearError,
    refreshToken,
    refreshAccessToken,
    verifyAction,
    refreshMerchantData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Check if a user has a specific permission.
 * Supports wildcard and hierarchical permission matching.
 */
function hasPermission(
  permissions: string[] | undefined,
  required: string,
): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }

  // Wildcard grants all permissions
  if (permissions.includes("*")) {
    return true;
  }

  // Exact match
  if (permissions.includes(required)) {
    return true;
  }

  // Check for wildcard matches (e.g., "bookings.*" matches "bookings.view")
  const [category, action] = required.split(".");
  if (action) {
    if (permissions.includes(`${category}.*`)) {
      return true;
    }
    // Parent permission grants child (e.g., "bookings" grants "bookings.view")
    if (permissions.includes(category)) {
      return true;
    }
  }

  return false;
}

// Hook for checking if user has specific permissions
export function usePermissions() {
  const { user } = useAuth();

  // Get permissions from user object, defaulting to empty array
  const permissions = user?.permissions || [];

  // Check if user is owner (type=merchant or has wildcard permission)
  const isOwner = user?.type === "merchant" || permissions.includes("*");

  // Helper to check a specific permission
  const can = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (isOwner) return true;
      return hasPermission(permissions, permission);
    },
    [user, isOwner, permissions],
  );

  return {
    // Permission check function - use this for granular checks
    can,
    hasPermission: can,

    // Common permission checks for backward compatibility
    canManageStaff:
      can("staff.view") || can("staff.create") || can("staff.update"),
    canManageServices:
      can("services.view") || can("services.create") || can("services.update"),
    canViewReports: can("reports.view"),
    canExportReports: can("reports.export"),
    canProcessPayments: can("payments.process"),
    canRefundPayments: can("payments.refund"),
    canManageBookings: can("bookings.create") || can("bookings.update"),
    canCancelBookings: can("bookings.cancel"),
    canDeleteBookings: can("bookings.delete"),
    canManageCustomers: can("customers.create") || can("customers.update"),
    canDeleteCustomers: can("customers.delete"),
    canExportCustomers: can("customers.export"),
    canUpdateSettings: can("settings.update"),
    canAccessBilling: can("settings.billing"),

    // Role-based checks (Owner, Manager, Staff)
    isOwner,
    isManager: user?.role === "Manager" || user?.role === "manager",
    isStaff: user?.role === "Staff" || user?.role === "staff",

    // User type checks
    isMerchantOwner: user?.type === "merchant",
    isMerchantUser: user?.type === "merchant_user",
    isPinStaff: user?.type === "staff",

    // Raw permissions for custom checks
    permissions,
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
