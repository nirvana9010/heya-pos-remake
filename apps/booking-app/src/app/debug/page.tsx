'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heya-pos/ui';

export default function DebugPage() {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    // Set API URL after mount to avoid hydration issues
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api');
  }, []);
  
  const testFetch = async () => {
    setError('');
    setResult(null);
    
    try {
      const fullUrl = `${apiUrl}/v1/public/merchant-info?subdomain=hamilton`;
      console.log('[Debug] Testing fetch to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'X-Merchant-Subdomain': 'hamilton',
        },
      });
      
      console.log('[Debug] Response status:', response.status);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('[Debug] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      
      <div className="mb-4">
        <p>API URL: {apiUrl}</p>
        <p>Detection Mode: {process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE || 'path'}</p>
      </div>
      
      <Button onClick={testFetch} className="mb-4">
        Test Fetch
      </Button>
      
      {error && (
        <div className="bg-red-100 p-4 rounded mb-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-green-100 p-4 rounded">
          <p className="text-green-600">Success!</p>
          <pre className="mt-2">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}