'use client';

import { useEffect } from 'react';

export function TyroSDKLoader() {
  useEffect(() => {
    // Fallback loader for Tyro SDK if Next.js Script component fails
    if (typeof window === 'undefined') return;

    const checkAndLoadSDK = () => {
      // Check if SDK is already loaded
      if (window.TYRO) {
        console.log('[TyroSDKLoader] SDK already loaded');
        return;
      }

      // Determine which SDK to load based on environment
      const environment = process.env.NEXT_PUBLIC_TYRO_ENVIRONMENT;
      
      // Try multiple possible paths for the SDK
      const possiblePaths = environment === 'production' 
        ? [
            '/js/iclient-with-ui-v1.js',
            '/_next/static/media/iclient-with-ui-v1.js',
            '/iclient-with-ui-v1.js',
            'https://iclient.tyro.com/iclient-with-ui-v1.js' // Fallback to Tyro CDN
          ]
        : [
            '/js/iclient-with-ui-v1.js.simulator',
            '/_next/static/media/iclient-with-ui-v1.js.simulator',
            '/iclient-with-ui-v1.js.simulator'
          ];

      console.log(`[TyroSDKLoader] Loading ${environment} SDK, trying paths:`, possiblePaths);

      let attemptIndex = 0;

      const tryLoadScript = () => {
        if (attemptIndex >= possiblePaths.length) {
          console.error('[TyroSDKLoader] Failed to load SDK from all paths');
          return;
        }

        const scriptSrc = possiblePaths[attemptIndex];
        console.log(`[TyroSDKLoader] Attempting to load from: ${scriptSrc}`);

        // Create and append script tag
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        
        script.onload = () => {
          console.log(`[TyroSDKLoader] SDK loaded successfully from ${scriptSrc}`);
          if (window.TYRO) {
            console.log('[TyroSDKLoader] TYRO global object is available');
            // Dispatch custom event to notify other components
            window.dispatchEvent(new Event('tyro-sdk-loaded'));
          }
        };

        script.onerror = (error) => {
          console.error(`[TyroSDKLoader] Failed to load from ${scriptSrc}:`, error);
          // Remove failed script
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          // Try next path
          attemptIndex++;
          tryLoadScript();
        };

        document.body.appendChild(script);
      };

      tryLoadScript();
    };

    // Add a delay to ensure Next.js Script component has a chance to load first
    const timer = setTimeout(checkAndLoadSDK, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}