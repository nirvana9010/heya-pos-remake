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
  async login(username: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
    const response = await this.post('/auth/merchant/login', {
      username,
      password,
    }, undefined, 'v1');
    
    // Normalize the response to match what the frontend expects
    const result = {
      access_token: response.token,
      refresh_token: response.refreshToken,
      user: response.user,
      merchant: response.user, // The API returns user info that includes merchant data
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
      console.log(`[Auth Client] Scheduling token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
      
      (window as any).tokenRefreshTimeout = setTimeout(async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          console.log('[Auth Client] Proactive token refresh triggered');
          try {
            await this.refreshToken(refreshToken);
          } catch (error) {
            console.error('[Auth Client] Proactive refresh failed:', error);
          }
        }
      }, refreshTime);
    }
  }
}