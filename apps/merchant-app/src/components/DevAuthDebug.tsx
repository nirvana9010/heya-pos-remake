'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';

export function DevAuthDebug() {
  const { isAuthenticated, user, merchant, tokenExpiresAt } = useAuth();

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    const token = localStorage.getItem('access_token');
    const authCookie = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('authToken='));
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      isAuthenticated,
      hasLocalStorageToken: !!token,
      hasCookie: !!authCookie,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      user: user?.name || 'No user',
      merchant: merchant?.name || 'No merchant',
      tokenExpiresAt: tokenExpiresAt?.toISOString() || 'No expiry',
      tokenExpired: tokenExpiresAt ? new Date() > tokenExpiresAt : null,
      currentPath: window.location.pathname
    };

    console.log(
      '%c🔐 Auth Debug (Mount)',
      'background: #1e40af; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      debugInfo
    );
  }, []); // Only on mount

  // Log on significant auth changes
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log(
      '%c🔐 Auth State Changed',
      'background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
      {
        isAuthenticated,
        user: user?.name || 'No user',
        merchant: merchant?.name || 'No merchant'
      }
    );
  }, [isAuthenticated]); // Only when auth state actually changes

  // This component renders nothing
  return null;
}

// Export a no-op component for production builds
export function DevAuthDebugWrapper({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        <DevAuthDebug />
        {children}
      </>
    );
  }
  return <>{children}</>;
}