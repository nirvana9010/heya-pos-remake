"use client";

import React, { useState, useEffect } from 'react';

export default function TestProductionPage() {
  const [environment, setEnvironment] = useState<'test' | 'production'>('test');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [merchantId, setMerchantId] = useState('TEST_MERCHANT');
  const [terminalId, setTerminalId] = useState('TEST_TID');

  // Production credentials (your real ones)
  const PROD_CREDENTIALS = {
    apiKey: 'iPqaqk7PXPEIcCMhZPmml0efsajK590',
    merchantId: '189815',
  };

  // Test credentials  
  const TEST_CREDENTIALS = {
    apiKey: 'test-api-key',
    merchantId: 'TEST_MERCHANT',
  };

  useEffect(() => {
    const checkSDK = () => {
      setSdkLoaded(!!(window.TYRO?.IClientWithUI));
    };
    checkSDK();
    setTimeout(checkSDK, 2000);
  }, []);

  useEffect(() => {
    if (environment === 'production') {
      setMerchantId('189815');
      setTerminalId('YOUR_TERMINAL_ID');
    } else {
      setMerchantId('TEST_MERCHANT');
      setTerminalId('TEST_TID');
    }
  }, [environment]);

  const testCredentials = () => {
    if (!window.TYRO?.IClientWithUI) {
      setTestResult('❌ SDK not available');
      return;
    }

    const credentials = environment === 'production' ? PROD_CREDENTIALS : TEST_CREDENTIALS;
    setTestResult('🔄 Testing credentials...');

    try {
      console.log(`Testing ${environment} credentials:`, credentials);
      
      const client = new window.TYRO.IClientWithUI(credentials.apiKey, {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0'
      });

      console.log('✅ Client created successfully');
      setTestResult('✅ Client created - testing server connection...');

      // Test server connection with pairing
      client.pairTerminal(merchantId, terminalId, (response: any) => {
        console.log('Server response:', response);
        
        if (environment === 'test') {
          setTestResult('🎉 TEST: Integration working! (Simulator response)');
        } else {
          if (response.status === 'inProgress') {
            setTestResult('🎉 PRODUCTION: Credentials ACTIVE! Connected to Tyro servers');
          } else if (response.status === 'error' && response.message?.includes('unauthorized')) {
            setTestResult('❌ PRODUCTION: Credentials rejected by Tyro');
          } else {
            setTestResult(`⚠️ PRODUCTION: Connected but: ${response.status} - ${response.message}`);
          }
        }
      });

    } catch (error) {
      console.error('Test failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes('API key') || errorMsg.includes('authentication')) {
        setTestResult(`❌ ${environment.toUpperCase()}: Invalid credentials`);
      } else {
        setTestResult(`❌ ${environment.toUpperCase()}: ${errorMsg}`);
      }
    }
  };

  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    margin: '10px 0',
    backgroundColor: '#fff'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔑 Test Production Credentials</h1>
      <p>Test your actual Tyro production API keys</p>

      {/* Environment Toggle */}
      <div style={cardStyle}>
        <h2>Environment Selection</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '20px' }}>
            <input
              type="radio"
              value="test"
              checked={environment === 'test'}
              onChange={(e) => setEnvironment(e.target.value as 'test')}
              style={{ marginRight: '5px' }}
            />
            🧪 Test/Sandbox (Simulator)
          </label>
          <label>
            <input
              type="radio"
              value="production"
              checked={environment === 'production'}
              onChange={(e) => setEnvironment(e.target.value as 'production')}
              style={{ marginRight: '5px' }}
            />
            🚀 Production (Real Tyro Servers)
          </label>
        </div>
        
        <div style={{ 
          padding: '10px', 
          borderRadius: '4px', 
          backgroundColor: environment === 'production' ? '#fff3cd' : '#d1ecf1',
          border: `1px solid ${environment === 'production' ? '#ffeaa7' : '#bee5eb'}`
        }}>
          <strong>Current:</strong> {environment === 'production' ? '🚀 Production Mode' : '🧪 Test Mode'}
          <br />
          <strong>SDK URL:</strong> {environment === 'production' 
            ? 'https://www.tyro.com/js/iclient-with-ui-v1.js' 
            : 'https://iclientsimulator.test.tyro.com/iclient-with-ui-v1.js'
          }
          <br />
          <strong>API Key:</strong> {environment === 'production' 
            ? PROD_CREDENTIALS.apiKey.substring(0, 8) + '...' 
            : TEST_CREDENTIALS.apiKey
          }
        </div>
      </div>

      {/* Terminal Configuration */}
      <div style={cardStyle}>
        <h2>Terminal Configuration</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Merchant ID:
          </label>
          <input
            type="text"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Terminal ID:
          </label>
          <input
            type="text"
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
          />
          {environment === 'production' && (
            <small style={{ color: '#666', fontStyle: 'italic' }}>
              * For production, use your actual terminal ID from the physical device
            </small>
          )}
        </div>
      </div>

      {/* Test Button */}
      <div style={cardStyle}>
        <h2>Credential Test</h2>
        <button
          onClick={testCredentials}
          disabled={!sdkLoaded}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: environment === 'production' ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: sdkLoaded ? 'pointer' : 'not-allowed',
            opacity: sdkLoaded ? 1 : 0.5,
            width: '100%'
          }}
        >
          {environment === 'production' ? '🚀 Test Production Keys' : '🧪 Test Sandbox Integration'}
        </button>

        {testResult && (
          <div style={{ 
            marginTop: '15px',
            padding: '15px',
            borderRadius: '5px',
            backgroundColor: testResult.includes('🎉') ? '#d4edda' : 
                            testResult.includes('❌') ? '#f8d7da' : 
                            testResult.includes('🔄') ? '#fff3cd' : '#f8f9fa',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {testResult}
          </div>
        )}
      </div>

      {/* Status */}
      <div style={cardStyle}>
        <h2>Status</h2>
        <div><strong>SDK Loaded:</strong> {sdkLoaded ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Current Page SDK:</strong> Test Simulator</div>
        <div><strong>Note:</strong> To test production keys with production SDK, you'd need to change the script tag in layout.tsx</div>
      </div>

      {/* Instructions */}
      <div style={cardStyle}>
        <h2>📋 What This Tests</h2>
        <ul>
          <li><strong>🧪 Test Mode:</strong> Confirms integration works (always succeeds)</li>
          <li><strong>🚀 Production Mode:</strong> Tests if your real API keys are active with Tyro</li>
        </ul>
        
        <h3>Expected Results:</h3>
        <ul>
          <li><strong>🎉 Credentials ACTIVE:</strong> Your keys work with Tyro servers</li>
          <li><strong>❌ Credentials rejected:</strong> Keys are invalid or inactive</li>
          <li><strong>⚠️ Connected but...</strong> Keys work, but other issue (normal without physical terminal)</li>
        </ul>
      </div>
    </div>
  );
}