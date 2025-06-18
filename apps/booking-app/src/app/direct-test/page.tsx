'use client';

import { useEffect, useState } from 'react';

export default function DirectTestPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testFetch = async () => {
      try {
        console.log('[DirectTest] Starting fetch test...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
        const url = `${apiUrl}/v1/public/merchant-info?subdomain=hamilton`;
        
        console.log('[DirectTest] Fetching from:', url);
        console.log('[DirectTest] Environment:', {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
          NODE_ENV: process.env.NODE_ENV
        });
        
        const response = await fetch(url, {
          headers: {
            'X-Merchant-Subdomain': 'hamilton',
          },
        });
        
        console.log('[DirectTest] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[DirectTest] Success:', result);
        setData(result);
      } catch (err) {
        console.error('[DirectTest] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    testFetch();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p>{error}</p>
        <p className="mt-4 text-sm">Check the browser console for more details.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-4">Success!</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}