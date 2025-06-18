'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heya-pos/ui';

export default function FetchTestPage() {
  const [results, setResults] = useState<any[]>([]);
  
  const addResult = (message: string, data?: any) => {
    setResults(prev => [...prev, { 
      time: new Date().toISOString(), 
      message, 
      data 
    }]);
  };
  
  useEffect(() => {
    addResult('Component mounted');
    addResult('Environment check', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV,
      typeof_window: typeof window
    });
  }, []);
  
  const testFetch = async () => {
    addResult('Starting fetch test...');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const url = `${apiUrl}/v1/public/merchant-info?subdomain=hamilton`;
      
      addResult('Fetching from URL', { url, apiUrl });
      
      const response = await fetch(url, {
        headers: {
          'X-Merchant-Subdomain': 'hamilton',
        },
      });
      
      addResult('Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult('Success!', data);
      } else {
        const text = await response.text();
        addResult('Error response', { text });
      }
    } catch (error) {
      addResult('Fetch error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fetch Test Page</h1>
      
      <Button onClick={testFetch} className="mb-6">
        Run Fetch Test
      </Button>
      
      <div className="space-y-4">
        {results.map((result, i) => (
          <div key={i} className="border rounded p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">{result.message}</span>
              <span className="text-xs text-gray-500">{result.time}</span>
            </div>
            {result.data && (
              <pre className="text-sm bg-white p-2 rounded overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}