'use client';

import { useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Application error:', error);
    
    // Check if this is a chunk loading error
    if (error.message?.includes('ChunkLoadError') || error.message?.includes('Failed to fetch')) {
      // Clear any problematic state
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
  }, [error]);

  const handleReset = () => {
    // If it's a chunk error, do a hard reload
    if (error.message?.includes('ChunkLoadError') || error.message?.includes('Failed to fetch')) {
      window.location.href = '/login';
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            {error.message?.includes('ChunkLoadError') || error.message?.includes('Failed to fetch')
              ? 'There was a problem loading the application. This might be due to an authentication issue.'
              : 'An unexpected error occurred. Please try again.'}
          </p>
          
          <div className="space-y-2">
            <Button onClick={handleReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {error.message?.includes('ChunkLoadError') ? 'Return to Login' : 'Try Again'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/emergency-logout.html'}
              className="w-full"
            >
              Emergency Logout
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}