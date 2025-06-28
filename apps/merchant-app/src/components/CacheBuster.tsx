'use client';

import { useCallback } from 'react';
import { Button } from '@heya-pos/ui';
import { RefreshCw } from 'lucide-react';

export function CacheBuster() {
  const clearCache = useCallback(async () => {
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear service worker caches if any
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Unregister service workers if any
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }
      
      // Clear Next.js specific caches
      // Clear module cache by reloading
      window.location.reload(true);
    } catch (error) {
      console.error('Cache clear error:', error);
      // Even if there's an error, still reload
      window.location.reload(true);
    }
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={clearCache}
      title="Clear all caches and reload (Dev only)"
      className="text-gray-600 hover:text-gray-900"
    >
      <RefreshCw size={18} />
    </Button>
  );
}