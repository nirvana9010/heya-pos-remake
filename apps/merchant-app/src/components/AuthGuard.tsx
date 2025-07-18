'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout>();
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Clear any pending redirects on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Don't check while loading
    if (isLoading) {
      return;
    }

    // Mark that we've checked auth
    setHasCheckedAuth(true);

    // Check if already redirecting globally
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      console.log('[AuthGuard] Redirect already in progress, skipping');
      return;
    }

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
      
      // Only redirect if not already on login page and haven't redirected yet
      if (pathname !== '/login' && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        setShowRedirectMessage(true);
        // Set global flag to prevent API calls and other redirects
        (window as any).__AUTH_REDIRECT_IN_PROGRESS__ = true;
        
        // Add a small delay to prevent race conditions
        redirectTimeoutRef.current = setTimeout(() => {
          console.log('[AuthGuard] Executing redirect to login');
          try {
            router.replace(`/login?from=${encodeURIComponent(pathname)}`);
          } catch (error) {
            console.error('[AuthGuard] Failed to redirect:', error);
            // Fallback: use window.location for redirect
            window.location.href = `/login?from=${encodeURIComponent(pathname)}`;
          }
        }, 100);
        
        // Set up fallback redirect after 3 seconds
        fallbackTimeoutRef.current = setTimeout(() => {
          console.warn('[AuthGuard] Redirect seems stuck, forcing navigation');
          window.location.href = '/login';
        }, 3000);
      }
    }
  }, [isAuthenticated, isLoading, tokenExpiresAt, pathname, router]);

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
  if (!isAuthenticated || isTokenExpired || showRedirectMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
          <p className="text-sm text-gray-500 mt-2">If you're not redirected, <a href="/login" className="text-blue-600 underline">click here</a></p>
        </div>
      </div>
    );
  }

  // Render children if authenticated with valid token
  return <>{children}</>;
}