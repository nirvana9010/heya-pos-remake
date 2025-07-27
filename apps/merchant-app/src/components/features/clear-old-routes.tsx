'use client';

import { useEffect } from 'react';

export function ClearOldRoutes() {
  useEffect(() => {
    // Clear any cached references to old routes
    const clearOldRoutes = async () => {
      try {
        // If service worker is available, send a message to clear specific cache entries
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          // Clear caches that might contain the old route
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              const cache = await caches.open(cacheName);
              // Delete the old bookings-lite route from cache
              await cache.delete('/bookings-lite');
              await cache.delete('/bookings-lite/');
              // Also clear any navigation requests that might be cached
              const keys = await cache.keys();
              for (const request of keys) {
                if (request.url.includes('bookings-lite')) {
                  await cache.delete(request);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error clearing old routes:', error);
      }
    };

    clearOldRoutes();
  }, []);

  return null;
}