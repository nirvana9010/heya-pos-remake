'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@heya-pos/ui';

/**
 * Service Worker Registration Component - Phase 3 Build System Improvements
 * 
 * Registers the service worker and handles updates.
 */

export function ServiceWorkerRegistration() {
  const { toast } = useToast();
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const buildId = (window as any)?.__NEXT_DATA__?.buildId as string | undefined;
      const swUrl = buildId ? `/sw.js?build=${encodeURIComponent(buildId)}` : '/sw.js';

      const registration = await navigator.serviceWorker.register(swUrl, {
        updateViaCache: 'none',
      });
      
      console.log('[ServiceWorker] Registration successful:', registration.scope);

      // Force the active worker to take control of existing clients
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // New service worker activated
            if (navigator.serviceWorker.controller) {
              // Show update notification
              toast({
                title: 'Update Available',
                description: 'A new version is available. Refresh to update.',
                action: (
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    Refresh
                  </button>
                ),
              });
            }
          }
        });
      });

      // Handle controller change (when SW takes control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // This fires when the service worker controlling this page changes
        console.log('[ServiceWorker] Controller changed');
        if (hasReloaded.current) {
          return;
        }
        hasReloaded.current = true;
        window.location.reload();
      });

    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
    }
  };

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: 'Back Online',
        description: 'Your connection has been restored.',
      });
    };

    const handleOffline = () => {
      toast({
        title: 'No Connection',
        description: 'You are currently offline. Some features may be limited.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return null;
}
