import { BaseApiClient } from './base-client';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: any;
  merchant: any;
  expiresAt: string;
}

export interface VerifyActionRequest {
  pin: string;
  action: string;
}

export class AuthClient extends BaseApiClient {
  async login(email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
    
    const payload = {
      email,
      password,
    };
    
    try {
      const response = await this.post('/auth/merchant/login', payload, undefined, 'v1');
    
    // Normalize the response to match what the frontend expects
    // The API now returns the full merchant object with locations
    const result = {
      access_token: response.token,
      refresh_token: response.refreshToken,
      user: {
        id: response.user.id,
        username: response.user.email, // Use email as username
        role: response.user.role,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        email: response.user.email
      },
      merchant: response.merchant || {
        id: response.merchantId,
        name: response.user.firstName,
        email: response.user.email,
        subdomain: 'hamilton',
        locations: [] // Empty array if no locations
      },
      expiresAt: response.expiresAt
    };

    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('remember_me', 'true');
    } else {
      sessionStorage.setItem('session_only', 'true');
    }

    // Schedule proactive token refresh
    this.scheduleTokenRefresh(response.expiresAt);

    return result;
    } catch (error: any) {
      // Re-throw the error with proper structure for auth provider
      if (error.response?.data?.message) {
        const authError = new Error(error.response.data.message);
        (authError as any).response = error.response;
        throw authError;
      }
      throw error;
    }
  }

  async verifyAction(pin: string, action: string) {
    return this.post('/auth/verify-action', { pin, action }, undefined, 'v1');
  }

  async refreshToken(refreshToken: string) {
    return this.post('/auth/refresh', { refreshToken }, undefined, 'v1');
  }

  // Make scheduleTokenRefresh accessible to auth client
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
            await this.refreshToken(refreshToken);
          } catch (error) {
          }
        }
      }, refreshTime);
    }
  }
}