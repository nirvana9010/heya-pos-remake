/**
 * SINGLE SOURCE OF TRUTH for authentication tokens and storage keys
 * 
 * NEVER use string literals for auth tokens anywhere in the codebase.
 * ALWAYS import from this file.
 * 
 * This prevents the recurring mistake of using 'authToken' instead of 'access_token'
 */

export const AUTH_TOKENS = {
  // localStorage keys
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  MERCHANT: 'merchant',
  REMEMBER_ME: 'remember_me',
  
  // Cookie names (different from localStorage!)
  AUTH_COOKIE: 'authToken',
} as const;

// Helper functions to enforce consistency
export const authStorage = {
  getAccessToken: () => localStorage.getItem(AUTH_TOKENS.ACCESS_TOKEN),
  getRefreshToken: () => localStorage.getItem(AUTH_TOKENS.REFRESH_TOKEN),
  getUser: () => {
    const user = localStorage.getItem(AUTH_TOKENS.USER);
    return user ? JSON.parse(user) : null;
  },
  getMerchant: () => {
    const merchant = localStorage.getItem(AUTH_TOKENS.MERCHANT);
    return merchant ? JSON.parse(merchant) : null;
  },
  
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(AUTH_TOKENS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(AUTH_TOKENS.REFRESH_TOKEN, refreshToken);
  },
  
  clearAll: () => {
    localStorage.removeItem(AUTH_TOKENS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_TOKENS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_TOKENS.USER);
    localStorage.removeItem(AUTH_TOKENS.MERCHANT);
    localStorage.removeItem(AUTH_TOKENS.REMEMBER_ME);
  }
};

// Export common auth header helper
export const getAuthHeader = () => {
  const token = authStorage.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};