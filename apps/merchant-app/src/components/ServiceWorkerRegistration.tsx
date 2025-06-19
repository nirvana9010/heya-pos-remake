'use client';

import { useEffect } from 'react';
import { useToast } from '@heya-pos/ui';

/**
 * Service Worker Registration Component - Phase 3 Build System Improvements
 * 
 * Registers the service worker and handles updates.
 */

export function ServiceWorkerRegistration() {
  const { toast } = useToast();

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
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('[ServiceWorker] Registration successful:', registration.scope);

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