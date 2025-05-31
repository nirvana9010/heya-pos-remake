'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('[AuthGuard] Checking authentication...');
    console.log('[AuthGuard] Current pathname:', pathname);

    // Check for access token
    const token = localStorage.getItem('access_token');
    console.log('[AuthGuard] Token exists:', !!token);

    if (!token) {
      console.log('[AuthGuard] No token found, redirecting to login');
      setIsAuthenticated(false);
      setIsChecking(false);
      
      // Only redirect once to avoid multiple redirects
      if (!hasRedirected) {
        setHasRedirected(true);
        // Use window.location for immediate redirect
        window.location.href = '/login';
      }
    } else {
      console.log('[AuthGuard] Token found, allowing access');
      setIsAuthenticated(true);
      setIsChecking(false);
    }
  }, [pathname, hasRedirected]);

  // Show loading spinner while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated after checking, show nothing (prevents any API calls)
  if (!isAuthenticated) {
    console.log('[AuthGuard] Not authenticated, preventing render');
    return null;
  }

  // Render children if authenticated
  return <>{children}</>;
}