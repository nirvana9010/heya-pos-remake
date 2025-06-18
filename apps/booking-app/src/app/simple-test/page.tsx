'use client';

import { useEffect } from 'react';

export default function SimpleTestPage() {
  useEffect(() => {
    // Test 1: Direct fetch without env variable
    fetch('http://localhost:3000/api/v1/public/merchant-info?subdomain=hamilton', {
      headers: {
        'X-Merchant-Subdomain': 'hamilton',
      },
    })
      .then(res => res.json())
      .then(data => console.log('[SimpleTest] Success with hardcoded URL:', data))
      .catch(err => console.error('[SimpleTest] Error with hardcoded URL:', err));
    
    // Test 2: Using env variable
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    console.log('[SimpleTest] Environment variable:', apiUrl);
    
    if (apiUrl) {
      fetch(`${apiUrl}/v1/public/merchant-info?subdomain=hamilton`, {
        headers: {
          'X-Merchant-Subdomain': 'hamilton',
        },
      })
        .then(res => res.json())
        .then(data => console.log('[SimpleTest] Success with env URL:', data))
        .catch(err => console.error('[SimpleTest] Error with env URL:', err));
    }
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
      <p>Check the browser console for results.</p>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
      </div>
    </div>
  );
}