'use client';

import { useEffect, useState } from 'react';
import { SSETracker } from '@/components/calendar/SSETracker';
import { getSSEClient } from '@/lib/services/sse-notifications';

export default function TestSSEPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const authToken = localStorage.getItem('access_token');
    setToken(authToken);
    
    const client = getSSEClient();
    const interval = setInterval(() => {
      setIsConnected(client.isConnected());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
    if (!token) {
      alert('No auth token found. Please login first.');
      return;
    }
    
    const client = getSSEClient();
    client.connect(token);
  };

  const handleDisconnect = () => {
    const client = getSSEClient();
    client.disconnect();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SSE Tracker Test Page</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p>Auth Token: {token ? '✅ Present' : '❌ Missing'}</p>
        <p>SSE Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
      </div>
      
      <div className="space-x-4 mb-4">
        <button 
          onClick={handleConnect}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!token || isConnected}
        >
          Connect SSE
        </button>
        
        <button 
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={!isConnected}
        >
          Disconnect SSE
        </button>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>The SSE tracker should appear in the bottom-right corner.</p>
        <p>If not logged in, go to <a href="/login" className="text-blue-500 underline">/login</a> first.</p>
      </div>
      
      <SSETracker />
    </div>
  );
}