'use client';

import { useMerchant } from '@/contexts/merchant-context';
import { useTimezone } from '@/contexts/timezone-context';
import apiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';

export default function DebugMerchantPage() {
  const { merchant, loading: merchantLoading, error: merchantError, merchantSubdomain } = useMerchant();
  const { merchantTimezone, userTimezone, loading: tzLoading } = useTimezone();
  const [apiTest, setApiTest] = useState<any>(null);
  const [apiError, setApiError] = useState<string>('');
  
  const testApi = async () => {
    try {
      setApiError('');
      setApiTest(null);
      
      // Test getting services through the API client
      const response = await apiClient.get('/public/services');
      setApiTest(response);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Merchant Context</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="font-semibold mb-2">Merchant Context</h2>
          <div className="text-sm space-y-1">
            <p>Loading: {merchantLoading ? 'true' : 'false'}</p>
            <p>Error: {merchantError || 'none'}</p>
            <p>Subdomain: {merchantSubdomain || 'not detected'}</p>
            <p>Merchant Name: {merchant?.name || 'not loaded'}</p>
            <p>Merchant ID: {merchant?.id || 'not loaded'}</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="font-semibold mb-2">Timezone Context</h2>
          <div className="text-sm space-y-1">
            <p>Loading: {tzLoading ? 'true' : 'false'}</p>
            <p>Merchant TZ: {merchantTimezone}</p>
            <p>User TZ: {userTimezone}</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="font-semibold mb-2">API Client Test</h2>
          <Button onClick={testApi} className="mb-3">Test API Call</Button>
          {apiError && (
            <div className="text-red-600 text-sm mb-2">Error: {apiError}</div>
          )}
          {apiTest && (
            <pre className="text-xs bg-white p-2 rounded overflow-auto">
              {JSON.stringify(apiTest, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="font-semibold mb-2">Full Merchant Data</h2>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(merchant, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}