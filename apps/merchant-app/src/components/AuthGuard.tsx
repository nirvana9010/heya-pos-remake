'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, tokenExpiresAt } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Don't check while loading
    if (isLoading) {
      return;
    }

    // Mark that we've checked auth
    setHasCheckedAuth(true);

    // Check if token is expired
    const isTokenExpired = tokenExpiresAt && new Date(tokenExpiresAt) < new Date();
    
    // If not authenticated or token expired, redirect to login
    if (!isAuthenticated || isTokenExpired) {
      console.log('[AuthGuard] Auth check failed:', { 
        isAuthenticated, 
        isTokenExpired,
        tokenExpiresAt,
        pathname 
      });
      
      // Only redirect if not already on login page
      if (pathname !== '/login' && !isRedirecting) {
        setIsRedirecting(true);
        // Set global flag to prevent API calls
        (window as any).__AUTH_REDIRECT_IN_PROGRESS__ = true;
        // Use replace to prevent back button issues
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isAuthenticated, isLoading, tokenExpiresAt, pathname, router, isRedirecting]);

  // Show loading state while auth is initializing
  if (isLoading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Check token expiration on render as well
  const isTokenExpired = tokenExpiresAt && new Date(tokenExpiresAt) < new Date();
  
  // If not authenticated or token expired after check, show redirect message
  if (!isAuthenticated || isTokenExpired || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated with valid token
  return <>{children}</>;
}