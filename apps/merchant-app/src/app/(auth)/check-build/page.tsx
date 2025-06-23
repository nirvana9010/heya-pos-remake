'use client';

export default function CheckBuildPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Build Environment Check</h1>
      <div style={{ margin: '20px 0', padding: '20px', background: '#f0f0f0' }}>
        <p><strong>NEXT_PUBLIC_API_URL:</strong> {apiUrl || 'NOT SET (undefined)'}</p>
        <p><strong>Default would be:</strong> http://localhost:3000</p>
        <p><strong>Window location:</strong> {typeof window !== 'undefined' ? window.location.href : 'SSR'}</p>
      </div>
      
      <h2>What this means:</h2>
      {!apiUrl && (
        <div style={{ color: 'red' }}>
          <p>❌ NEXT_PUBLIC_API_URL is not set in the build!</p>
          <p>This means all API calls will go to http://localhost:3000 which won't work in production.</p>
          <p>You need to add this environment variable in Vercel's project settings and redeploy.</p>
        </div>
      )}
      {apiUrl && (
        <div style={{ color: 'green' }}>
          <p>✅ NEXT_PUBLIC_API_URL is set to: {apiUrl}</p>
          <p>API calls should work correctly.</p>
        </div>
      )}
    </div>
  );
}