'use client';

import { useEffect, useState, useLayoutEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Check auth synchronously on mount to avoid flash
function checkAuthSync() {
  if (typeof window === 'undefined') return true;
  const token = localStorage.getItem('access_token');
  return !!token;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Initialize with sync check to avoid flash
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuthSync);
  const [hasChecked, setHasChecked] = useState(false);

  // Use useLayoutEffect for faster auth check
  useLayoutEffect(() => {
    const token = localStorage.getItem('access_token');
    const authenticated = !!token;
    
    setIsAuthenticated(authenticated);
    setHasChecked(true);
    
    if (!authenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [pathname, router]);

  // If we haven't checked yet but initial sync check passed, render immediately
  // This prevents the loading state for authenticated users
  if (!hasChecked && isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated after checking, show nothing
  if (hasChecked && !isAuthenticated) {
    return null;
  }

  // Render children if authenticated
  return <>{children}</>;
}