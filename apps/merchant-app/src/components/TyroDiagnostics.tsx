'use client';

import { useEffect, useState } from 'react';
import { TYRO_CONFIG } from '@/constants/tyro';

export function TyroDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>({});

  useEffect(() => {
    const checkSDK = () => {
      const diag = {
        environment: TYRO_CONFIG.environment,
        expectedScript: TYRO_CONFIG.environment === 'production' 
          ? '/js/iclient-with-ui-v1.js'
          : '/js/iclient-with-ui-v1.js.simulator',
        hasApiKey: !!TYRO_CONFIG.apiKey,
        apiKeyLength: TYRO_CONFIG.apiKey?.length || 0,
        windowTYRO: !!window.TYRO,
        scriptTags: Array.from(document.getElementsByTagName('script'))
          .filter(s => s.src.includes('iclient'))
          .map(s => s.src),
        timestamp: new Date().toISOString(),
      };
      
      console.log('[TyroDiagnostics]', diag);
      setDiagnostics(diag);
    };

    // Check immediately
    checkSDK();

    // Check again after a delay
    const timer = setTimeout(checkSDK, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-black/80 text-white text-xs rounded-lg max-w-md">
      <div className="font-bold mb-2">Tyro SDK Diagnostics</div>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  );
}