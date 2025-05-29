// Server component (no 'use client')
export default function TestSSRPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SSR Test Page</h1>
      <p>This is a server component. If you can see this, SSR is working.</p>
      <p>Timestamp from server: {new Date().toISOString()}</p>
    </div>
  );
}