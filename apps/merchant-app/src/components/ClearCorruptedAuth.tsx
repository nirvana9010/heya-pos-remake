'use client';

import { useEffect } from 'react';

export function ClearCorruptedAuth() {
  useEffect(() => {
    // Check if we have corrupted auth data
    const user = localStorage.getItem('user');
    const merchant = localStorage.getItem('merchant');
    
    try {
      const userData = user ? JSON.parse(user) : null;
      const merchantData = merchant ? JSON.parse(merchant) : null;
      
      // If merchant data is same as user data (the old bug), clear everything
      if (merchantData && userData && JSON.stringify(merchantData) === JSON.stringify(userData)) {
        console.log('[ClearCorruptedAuth] Detected corrupted auth data, clearing...');
        
        // Clear all auth data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('merchant');
        localStorage.removeItem('remember_me');
        sessionStorage.clear();
        
        // Clear all cookies
        document.cookie.split(";").forEach(c => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Force reload to login page
        window.location.href = '/login';
      }
    } catch (e) {
      // If we can't parse, it's corrupted
      console.log('[ClearCorruptedAuth] Failed to parse auth data, clearing...');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  }, []);
  
  return null;
}