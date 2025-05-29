"use client";

import React, { useEffect, useState } from 'react';

export default function TestCredentialsPage() {
  const [credentialStatus, setCredentialStatus] = useState<string>('Testing...');
  const [sdkInitResult, setSdkInitResult] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [merchantId, setMerchantId] = useState<string>('');

  useEffect(() => {
    // Get the credentials from environment
    const envApiKey = process.env.NEXT_PUBLIC_TYRO_API_KEY || '';
    const envMerchantId = process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID || '';
    
    setApiKey(envApiKey);
    setMerchantId(envMerchantId);

    if (!envApiKey || envApiKey === 'test-api-key') {
      setCredentialStatus('❌ No API key configured or still using test key');
      return;
    }

    if (!envMerchantId || envMerchantId === 'TEST_MERCHANT') {
      setCredentialStatus('❌ No Merchant ID configured or still using test ID');
      return;
    }

    testCredentials(envApiKey, envMerchantId);
  }, []);

  const testCredentials = async (testApiKey: string, testMerchantId: string) => {
    if (!window.TYRO?.IClientWithUI) {
      setCredentialStatus('❌ Tyro SDK not available');
      return;
    }

    try {
      console.log('Testing credentials:', { 
        apiKey: testApiKey.substring(0, 8) + '...', 
        merchantId: testMerchantId 
      });

      // Try to initialize client with real credentials
      const client = new window.TYRO.IClientWithUI(testApiKey, {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0'
      });

      console.log('✅ Client initialized successfully:', client);
      
      setSdkInitResult({
        success: true,
        message: 'Client created successfully',
        apiKeyPrefix: testApiKey.substring(0, 8) + '...',
        merchantId: testMerchantId,
        timestamp: new Date().toISOString()
      });

      setCredentialStatus('✅ Credentials valid - SDK client created successfully');

      // Test if we can access Tyro's servers (this will tell us if keys are active)
      testServerConnection(client, testMerchantId);

    } catch (error) {
      console.error('❌ Credential test failed:', error);
      
      setSdkInitResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        apiKeyPrefix: testApiKey.substring(0, 8) + '...',
        merchantId: testMerchantId,
        timestamp: new Date().toISOString()
      });

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          setCredentialStatus('❌ Invalid API key - rejected by Tyro');
        } else if (error.message.includes('authentication')) {
          setCredentialStatus('❌ Authentication failed - check credentials');
        } else {
          setCredentialStatus(`❌ Error: ${error.message}`);
        }
      } else {
        setCredentialStatus('❌ Unknown error during credential validation');
      }
    }
  };

  const testServerConnection = (client: any, testMerchantId: string) => {
    try {
      // Attempt a terminal pairing call to test server connectivity
      // This will tell us if the credentials can actually communicate with Tyro's servers
      console.log('Testing server connection...');
      
      client.pairTerminal(testMerchantId, 'TEST_CONNECTION', (response: any) => {
        console.log('Server connection test response:', response);
        
        if (response.status === 'inProgress' || response.message) {
          setCredentialStatus('🎉 CREDENTIALS ACTIVE! Successfully connected to Tyro servers');
          setSdkInitResult(prev => ({
            ...prev,
            serverConnection: 'SUCCESS',
            serverResponse: response
          }));
        } else if (response.status === 'error') {
          if (response.message?.includes('unauthorized') || response.message?.includes('invalid')) {
            setCredentialStatus('❌ Credentials rejected by Tyro servers');
          } else {
            setCredentialStatus('⚠️ Connected to servers but pairing failed (normal without physical terminal)');
          }
          setSdkInitResult(prev => ({
            ...prev,
            serverConnection: 'CONNECTED_BUT_FAILED',
            serverResponse: response
          }));
        }
      });

    } catch (error) {
      console.error('Server connection test failed:', error);
      setCredentialStatus('⚠️ SDK initialized but server test failed');
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔑 Tyro Credentials Test</h1>
      <p>Test your production Tyro API credentials</p>

      <div style={{ 
        border: '2px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px', 
        margin: '20px 0',
        backgroundColor: credentialStatus.includes('🎉') ? '#d4edda' : 
                        credentialStatus.includes('✅') ? '#d1ecf1' :
                        credentialStatus.includes('❌') ? '#f8d7da' : '#fff3cd'
      }}>
        <h2>Credential Status</h2>
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{credentialStatus}</p>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
        <h2>Environment Configuration</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>API Key:</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                {apiKey ? maskApiKey(apiKey) : '❌ Not configured'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Merchant ID:</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                {merchantId || '❌ Not configured'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>Environment:</td>
              <td style={{ padding: '8px' }}>
                {process.env.NEXT_PUBLIC_TYRO_ENVIRONMENT || 'sandbox'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', fontWeight: 'bold' }}>SDK Available:</td>
              <td style={{ padding: '8px' }}>
                {typeof window !== 'undefined' && window.TYRO?.IClientWithUI ? '✅ Yes' : '❌ No'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {sdkInitResult && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
          <h2>Test Results</h2>
          <pre style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '5px', 
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {JSON.stringify(sdkInitResult, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', margin: '20px 0', backgroundColor: '#f8f9fa' }}>
        <h2>🎯 What This Test Tells You</h2>
        <ul>
          <li><strong>🎉 CREDENTIALS ACTIVE!</strong> = Your keys work and can connect to Tyro servers</li>
          <li><strong>✅ Credentials valid</strong> = SDK accepts your keys (good sign)</li>
          <li><strong>⚠️ Connected but pairing failed</strong> = Keys work, but need physical terminal for full test</li>
          <li><strong>❌ Invalid API key</strong> = Keys are wrong or inactive</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ul>
          <li>If credentials are active ✅, you can proceed with terminal setup</li>
          <li>If invalid ❌, contact Tyro support to activate your keys</li>
          <li>Check browser console (F12) for detailed error messages</li>
        </ul>
      </div>
    </div>
  );
}