'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';

export default function TestApiPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testEndpoints = [
    { name: 'Hamilton Info', url: '/api/v1/public/merchant-info?subdomain=hamilton' },
    { name: 'Zen Wellness Info', url: '/api/v1/public/merchant-info?subdomain=zen-wellness' },
    { name: 'Hamilton Services', url: '/api/v1/public/services?subdomain=hamilton' },
    { name: 'Invalid Merchant', url: '/api/v1/public/merchant-info?subdomain=invalid' },
  ];

  const testFetch = async (name: string, url: string) => {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const fullUrl = `${apiUrl}${url}`;

    try {
      console.log(`Testing ${name}:`, fullUrl);
      const startTime = Date.now();
      
      const response = await fetch(fullUrl, {
        headers: {
          'X-Merchant-Subdomain': url.includes('hamilton') ? 'hamilton' : 
                                   url.includes('zen-wellness') ? 'zen-wellness' : 'invalid',
        },
      });
      
      const endTime = Date.now();
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          statusText: response.statusText,
          time: endTime - startTime,
          data: data,
          error: null,
        }
      }));
    } catch (error: any) {
      console.error(`Error testing ${name}:`, error);
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'error',
          statusText: error.message,
          time: 0,
          data: null,
          error: error.stack || error.message,
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    for (const endpoint of testEndpoints) {
      await testFetch(endpoint.name, endpoint.url);
    }
  };

  useEffect(() => {
    // Log environment info
    console.log('Environment:', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_MERCHANT_DETECTION_MODE: process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE,
      window_location: window.location.href,
    });
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">API Connection Test</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Environment Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
{JSON.stringify({
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  DETECTION_MODE: process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE || 'path',
  Current_URL: typeof window !== 'undefined' ? window.location.href : 'SSR',
}, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="mb-8">
        <Button onClick={runAllTests} disabled={loading}>
          {loading ? 'Testing...' : 'Run All Tests'}
        </Button>
      </div>

      <div className="grid gap-4">
        {testEndpoints.map((endpoint) => (
          <Card key={endpoint.name}>
            <CardHeader>
              <CardTitle className="text-lg">{endpoint.name}</CardTitle>
              <code className="text-sm text-gray-600">{endpoint.url}</code>
            </CardHeader>
            <CardContent>
              {results[endpoint.name] ? (
                <div>
                  <div className="flex gap-4 mb-2">
                    <span className={`font-semibold ${
                      results[endpoint.name].status === 200 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Status: {results[endpoint.name].status}
                    </span>
                    <span className="text-gray-600">
                      Time: {results[endpoint.name].time}ms
                    </span>
                  </div>
                  {results[endpoint.name].error && (
                    <div className="bg-red-50 p-3 rounded mb-2">
                      <pre className="text-red-600 text-sm whitespace-pre-wrap">
                        {results[endpoint.name].error}
                      </pre>
                    </div>
                  )}
                  {results[endpoint.name].data && (
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(results[endpoint.name].data, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => testFetch(endpoint.name, endpoint.url)}
                  disabled={loading}
                >
                  Test This Endpoint
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}