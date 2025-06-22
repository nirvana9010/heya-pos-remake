'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    console.log('[useAuth] Hook initialized');
    console.log('[useAuth] Current path:', window.location.pathname);
    
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      console.log('[useAuth] Checking auth, token exists:', !!token);
      
      if (!token) {
        console.log('[useAuth] No access token found, redirecting to login...');
        console.log('[useAuth] Router push to /login');
        router.push('/login');
        
        // Also try direct navigation as backup
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            console.log('[useAuth] Router push failed, using window.location');
            window.location.href = '/login';
          }
        }, 500);
        
        return false;
      }
      return true;
    };

    const isAuthenticated = checkAuth();
    console.log('[useAuth] Is authenticated:', isAuthenticated);
    
    // Also check on focus to handle cases where user logs out in another tab
    const handleFocus = () => {
      console.log('[useAuth] Window focused, rechecking auth...');
      checkAuth();
    };

    if (isAuthenticated) {
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [router]);

  const logout = () => {
    // Clear all auth data from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('merchant');
    localStorage.removeItem('user');
    
    // Clear the auth cookie to prevent middleware redirect loop
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict';
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict';
    
    // Redirect to login
    router.push('/login');
  };

  return { logout };
}