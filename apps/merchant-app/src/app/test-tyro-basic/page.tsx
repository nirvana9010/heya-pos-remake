"use client";

import React, { useEffect, useState } from 'react';

export default function TestTyroBasicPage() {
  const [sdkStatus, setSdkStatus] = useState<string>('Checking...');
  const [sdkDetails, setSdkDetails] = useState<any>(null);

  useEffect(() => {
    const checkSDK = () => {
      if (typeof window !== 'undefined') {
        try {
          console.log('Window object:', !!window);
          console.log('TYRO object:', !!window.TYRO);
          console.log('TYRO.IClientWithUI:', !!window.TYRO?.IClientWithUI);
          
          if (window.TYRO && window.TYRO.IClientWithUI) {
            setSdkStatus('✅ SDK Loaded Successfully');
            setSdkDetails({
              tyroExists: true,
              iClientExists: true,
              canInitialize: true
            });
            
            // Try to create a client instance
            try {
              const testClient = new window.TYRO.IClientWithUI('test-key', {
                posProductVendor: 'HEYA',
                posProductName: 'HEYA POS',
                posProductVersion: '2.0.0'
              });
              console.log('✅ Test client created:', testClient);
              setSdkDetails(prev => ({ ...prev, clientCreated: true }));
            } catch (error) {
              console.error('❌ Client creation failed:', error);
              setSdkDetails(prev => ({ ...prev, clientError: error.message }));
            }
            
          } else if (window.TYRO) {
            setSdkStatus('⚠️ TYRO object found but IClientWithUI missing');
            setSdkDetails({ tyroExists: true, iClientExists: false });
          } else {
            setSdkStatus('❌ TYRO SDK not found');
            setSdkDetails({ tyroExists: false, iClientExists: false });
          }
        } catch (error) {
          setSdkStatus(`❌ Error: ${error.message}`);
          setSdkDetails({ error: error.message });
        }
      }
    };

    // Check immediately
    checkSDK();
    
    // Check again after delay
    setTimeout(checkSDK, 1000);
    setTimeout(checkSDK, 3000);
  }, []);

  const testPairing = () => {
    if (!window.TYRO?.IClientWithUI) {
      alert('SDK not available');
      return;
    }

    try {
      const client = new window.TYRO.IClientWithUI('test-key', {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0'
      });

      console.log('Attempting terminal pairing...');
      client.pairTerminal('TEST_MID', 'TEST_TID', (response) => {
        console.log('Pairing response:', response);
        alert(`Pairing response: ${JSON.stringify(response)}`);
      });
    } catch (error) {
      console.error('Pairing error:', error);
      alert(`Pairing error: ${error.message}`);
    }
  };

  const testPayment = () => {
    if (!window.TYRO?.IClientWithUI) {
      alert('SDK not available');
      return;
    }

    try {
      const client = new window.TYRO.IClientWithUI('test-key', {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0'
      });

      console.log('Attempting payment...');
      client.initiatePurchase(
        {
          amount: '1000', // $10.00 in cents
          cashout: 0,
          integratedReceipt: true,
          enableSurcharge: true
        },
        {
          transactionCompleteCallback: (response) => {
            console.log('Payment response:', response);
            alert(`Payment result: ${response.result}`);
          },
          receiptCallback: (receipt) => {
            console.log('Receipt:', receipt);
          }
        }
      );
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Tyro SDK Basic Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>SDK Status</h2>
        <p><strong>Status:</strong> {sdkStatus}</p>
        
        <h3>What you should see:</h3>
        <ul>
          <li><strong>✅ SDK Loaded Successfully</strong> - Perfect! SDK is working</li>
          <li><strong>⚠️ TYRO object found but IClientWithUI missing</strong> - SDK partially loaded</li>
          <li><strong>❌ TYRO SDK not found</strong> - SDK not loaded</li>
        </ul>
      </div>

      {sdkDetails && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h2>SDK Details</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(sdkDetails, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2>Test Functions</h2>
        <button 
          onClick={testPairing}
          style={{ 
            marginRight: '10px', 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Terminal Pairing
        </button>
        
        <button 
          onClick={testPayment}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Payment ($10.00)
        </button>
      </div>

      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f8f9fa' }}>
        <h2>Instructions</h2>
        <ol>
          <li>First, check the SDK Status above</li>
          <li>If SDK is loaded, try "Test Terminal Pairing" - you should see a modal popup</li>
          <li>Try "Test Payment" - you should see a payment modal</li>
          <li>Check browser console (F12) for detailed logs</li>
        </ol>
        
        <h3>Expected Behavior:</h3>
        <ul>
          <li><strong>Terminal Pairing:</strong> Modal should appear asking you to confirm on terminal</li>
          <li><strong>Payment:</strong> Modal should appear with payment interface</li>
          <li><strong>Console:</strong> Should show detailed logs of all operations</li>
        </ul>
      </div>
    </div>
  );
}