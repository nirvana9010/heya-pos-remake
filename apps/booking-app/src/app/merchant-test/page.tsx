'use client';

import { useEffect, useState } from 'react';
import { useMerchant } from '@/contexts/merchant-context';

export default function MerchantTestPage() {
  const { merchant, merchantSubdomain, loading, error } = useMerchant();
  const [clientInfo, setClientInfo] = useState<any>(null);
  
  useEffect(() => {
    // Get client-side info
    setClientInfo({
      pathname: window.location.pathname,
      hostname: window.location.hostname,
      href: window.location.href,
      search: window.location.search,
    });
  }, []);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Merchant Detection Test</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Context State</h2>
          <div className="space-y-1 text-sm">
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
            <p>Subdomain: <span className="font-mono bg-white px-2 py-1 rounded">{merchantSubdomain || 'null'}</span></p>
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Merchant Data</h2>
          {merchant ? (
            <div className="space-y-1 text-sm">
              <p>Name: <span className="font-semibold">{merchant.name}</span></p>
              <p>ID: {merchant.id}</p>
              <p>Subdomain: {merchant.subdomain}</p>
              <p>Email: {merchant.email}</p>
              <p>Timezone: {merchant.timezone}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No merchant data</p>
          )}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Client Info</h2>
          {clientInfo && (
            <div className="space-y-1 text-sm font-mono">
              <p>pathname: {clientInfo.pathname}</p>
              <p>hostname: {clientInfo.hostname}</p>
              <p>href: {clientInfo.href}</p>
              <p>search: {clientInfo.search}</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Expected vs Actual</h2>
          <div className="text-sm">
            {clientInfo?.pathname.includes('hamilton') && (
              <p>URL contains "hamilton" but subdomain is: {merchantSubdomain || 'null'}</p>
            )}
            {clientInfo?.pathname.includes('zen-wellness') && (
              <p>URL contains "zen-wellness" but subdomain is: {merchantSubdomain || 'null'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}