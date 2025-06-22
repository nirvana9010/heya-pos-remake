'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({
    cookies: '',
    localStorage: {},
    authState: null,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // Get all cookies
    const cookies = document.cookie;
    
    // Get localStorage items
    const localStorageItems: any = {};
    ['access_token', 'refresh_token', 'user', 'merchant'].forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        localStorageItems[key] = value.substring(0, 50) + '...'; // Truncate for display
      }
    });

    // Parse auth cookie if exists
    const authCookie = cookies.split(';').find(c => c.trim().startsWith('authToken='));
    const authToken = authCookie ? authCookie.split('=')[1] : null;

    setDebugInfo({
      cookies,
      authCookie: authToken ? authToken.substring(0, 50) + '...' : 'Not found',
      localStorage: localStorageItems,
      hasAuthCookie: !!authToken,
      hasLocalStorageToken: !!localStorageItems.access_token,
      mismatch: !!authToken !== !!localStorageItems.access_token,
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="bg-gray-100 p-3 rounded space-y-1 text-sm">
              <div>Has Auth Cookie: {debugInfo.hasAuthCookie ? '✅ Yes' : '❌ No'}</div>
              <div>Has LocalStorage Token: {debugInfo.hasLocalStorageToken ? '✅ Yes' : '❌ No'}</div>
              <div className={debugInfo.mismatch ? 'text-red-600 font-bold' : 'text-green-600'}>
                State Mismatch: {debugInfo.mismatch ? '⚠️ YES - This causes redirect loops!' : '✅ No'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Auth Cookie</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {debugInfo.authCookie}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">LocalStorage</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(debugInfo.localStorage, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">All Cookies</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {debugInfo.cookies || 'No cookies found'}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Redirect Flow</h3>
            <div className="bg-blue-50 p-3 rounded text-sm space-y-2">
              <p><strong>When you visit /login:</strong></p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Middleware checks for authToken cookie</li>
                <li>If cookie exists → redirects to /calendar</li>
              </ol>
              
              <p className="mt-3"><strong>When you visit /calendar:</strong></p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Page wrapped in AuthGuard (client-side)</li>
                <li>AuthGuard checks localStorage for access_token</li>
                <li>If no token → shows "Redirecting to login..." → redirects to /login</li>
                <li>Creates infinite loop if cookie exists but localStorage doesn't</li>
              </ol>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Generated at: {debugInfo.timestamp}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}