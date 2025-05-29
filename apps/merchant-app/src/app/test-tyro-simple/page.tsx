"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function TestTyroSimplePage() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    // Check if SDK is loaded
    const checkSDK = () => {
      if (typeof window !== 'undefined') {
        if (window.TYRO && window.TYRO.IClientWithUI) {
          setSdkLoaded(true);
          console.log('✅ Tyro SDK loaded successfully');
        } else {
          setSdkError('TYRO SDK not found on window object');
          console.error('❌ TYRO SDK not found');
        }
      }
    };

    // Check immediately
    checkSDK();

    // Also check after a delay in case SDK is still loading
    const timer = setTimeout(checkSDK, 2000);

    return () => clearTimeout(timer);
  }, []);

  const testSDKInitialization = () => {
    try {
      if (!window.TYRO?.IClientWithUI) {
        throw new Error('SDK not available');
      }

      const client = new window.TYRO.IClientWithUI('test-api-key', {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0',
      });

      console.log('✅ SDK client created successfully:', client);
      alert('SDK initialization successful! Check console for details.');
    } catch (error) {
      console.error('❌ SDK initialization failed:', error);
      alert(`SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tyro SDK Test</h1>
        <p className="text-muted-foreground mt-1">Simple test to verify Tyro SDK is loaded</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SDK Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {sdkLoaded ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">Tyro SDK loaded successfully</span>
              </>
            ) : sdkError ? (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 font-medium">SDK Error: {sdkError}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 font-medium">Checking SDK status...</span>
              </>
            )}
          </div>

          <div className="grid gap-2 text-sm">
            <div>
              <strong>Expected URL:</strong> /js/iclient-with-ui-v1.js
            </div>
            <div>
              <strong>Window.TYRO available:</strong> {typeof window !== 'undefined' ? (window.TYRO ? '✅ Yes' : '❌ No') : 'Checking...'}
            </div>
            <div>
              <strong>IClientWithUI available:</strong> {typeof window !== 'undefined' ? (window.TYRO?.IClientWithUI ? '✅ Yes' : '❌ No') : 'Checking...'}
            </div>
          </div>

          {sdkLoaded && (
            <Button onClick={testSDKInitialization} className="w-full">
              Test SDK Initialization
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
            {JSON.stringify({
              sdkLoaded,
              sdkError,
              windowTyroExists: typeof window !== 'undefined' ? !!window.TYRO : 'N/A',
              userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'N/A',
              currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}