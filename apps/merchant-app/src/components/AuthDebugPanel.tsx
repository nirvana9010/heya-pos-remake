'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';
import { Button } from '@heya-pos/ui';

export function AuthDebugPanel() {
  const { isAuthenticated, isLoading, user, merchant, tokenExpiresAt, error } = useAuth();
  const [authData, setAuthData] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const updateAuthData = () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const authCookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('authToken='));
      
      let tokenPayload = null;
      let tokenExpiry = null;
      
      if (token) {
        try {
          tokenPayload = JSON.parse(atob(token.split('.')[1]));
          tokenExpiry = new Date(tokenPayload.exp * 1000);
        } catch (e) {
          // Invalid token
        }
      }

      setAuthData({
        isAuthenticated,
        isLoading,
        hasAccessToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasCookie: !!authCookie,
        tokenExpiry: tokenExpiry?.toISOString(),
        tokenExpired: tokenExpiry ? new Date() > tokenExpiry : null,
        userName: user?.name || 'No user',
        userEmail: user?.email || 'No email',
        merchantName: merchant?.name || 'No merchant',
        merchantId: merchant?.id || 'No ID',
        currentPath: window.location.pathname,
        redirectFlag: (window as any).__AUTH_REDIRECT_IN_PROGRESS__,
        authError: error,
        middlewareExpiresAt: tokenExpiresAt?.toISOString(),
      });
    };

    updateAuthData();
    const interval = setInterval(updateAuthData, 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, user, merchant, tokenExpiresAt, error]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* Toggle button */}
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          onClick={() => setIsVisible(!isVisible)}
          size="sm"
          variant="outline"
          className="bg-white shadow-lg"
        >
          🔐 Auth Debug
        </Button>
      </div>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 w-96 max-h-[600px] overflow-auto bg-white border rounded-lg shadow-2xl p-4 z-[9998]">
          <h3 className="font-bold text-lg mb-2">Auth Debug Panel</h3>
          
          <div className="space-y-2 text-xs">
            {/* Status indicators */}
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${authData.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Authenticated: {String(authData.isAuthenticated)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${authData.isLoading ? 'bg-yellow-500' : 'bg-gray-500'}`} />
              <span>Loading: {String(authData.isLoading)}</span>
            </div>

            {authData.redirectFlag && (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-orange-600">Redirect in progress!</span>
              </div>
            )}

            {/* Auth data */}
            <div className="border-t pt-2 mt-2">
              <p><strong>User:</strong> {authData.userName} ({authData.userEmail})</p>
              <p><strong>Merchant:</strong> {authData.merchantName} (ID: {authData.merchantId})</p>
            </div>

            {/* Token status */}
            <div className="border-t pt-2 mt-2">
              <p className={authData.hasAccessToken ? 'text-green-600' : 'text-red-600'}>
                <strong>Access Token:</strong> {authData.hasAccessToken ? '✓' : '✗'}
              </p>
              <p className={authData.hasRefreshToken ? 'text-green-600' : 'text-red-600'}>
                <strong>Refresh Token:</strong> {authData.hasRefreshToken ? '✓' : '✗'}
              </p>
              <p className={authData.hasCookie ? 'text-green-600' : 'text-red-600'}>
                <strong>Auth Cookie:</strong> {authData.hasCookie ? '✓' : '✗'}
              </p>
            </div>

            {/* Token expiry */}
            {authData.tokenExpiry && (
              <div className="border-t pt-2 mt-2">
                <p><strong>Token Expires:</strong> {new Date(authData.tokenExpiry).toLocaleString()}</p>
                <p className={authData.tokenExpired ? 'text-red-600' : 'text-green-600'}>
                  <strong>Expired:</strong> {String(authData.tokenExpired)}
                </p>
              </div>
            )}

            {/* Error */}
            {authData.authError && (
              <div className="border-t pt-2 mt-2 text-red-600">
                <p><strong>Error:</strong> {authData.authError}</p>
              </div>
            )}

            {/* Current path */}
            <div className="border-t pt-2 mt-2">
              <p><strong>Current Path:</strong> {authData.currentPath}</p>
            </div>

            {/* Actions */}
            <div className="border-t pt-2 mt-2 space-y-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  document.cookie.split(";").forEach(c => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                  });
                  window.location.href = '/login';
                }}
              >
                Clear All Auth & Reload
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  console.log('Full Auth State:', {
                    context: { isAuthenticated, isLoading, user, merchant, tokenExpiresAt, error },
                    localStorage: {
                      access_token: localStorage.getItem('access_token'),
                      refresh_token: localStorage.getItem('refresh_token'),
                      user: localStorage.getItem('user'),
                      merchant: localStorage.getItem('merchant'),
                    },
                    cookies: document.cookie,
                    authData
                  });
                }}
              >
                Log Full Auth State
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}