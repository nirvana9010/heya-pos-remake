'use client';

import Script from 'next/script';

export function TyroScriptLoader() {
  const isProduction = process.env.NEXT_PUBLIC_TYRO_ENVIRONMENT === 'production';
  
  return (
    <>
      {/* Tyro SDK - load in production for card payments */}
      {isProduction && (
        <Script
          src="/js/iclient-with-ui-v1.js"
          strategy="lazyOnload"
          onLoad={() => {
            console.log('[Tyro] SDK loaded successfully');
            // Dispatch custom event to notify components
            window.dispatchEvent(new Event('tyro-sdk-loaded'));
          }}
          onError={(e) => {
            console.error('[Tyro] Failed to load SDK:', e);
          }}
        />
      )}
      
      {/* Tyro SDK Simulator - load in development */}
      {!isProduction && (
        <Script
          src="/js/iclient-with-ui-v1.js.simulator"
          strategy="lazyOnload"
          onLoad={() => {
            console.log('[Tyro] SDK Simulator loaded successfully');
            // Dispatch custom event to notify components
            window.dispatchEvent(new Event('tyro-sdk-loaded'));
          }}
          onError={(e) => {
            console.error('[Tyro] Failed to load SDK Simulator:', e);
          }}
        />
      )}
    </>
  );
}