"use client";

import React, { useState } from 'react';

// Simple mock invoice data
const mockInvoice = {
  id: 'inv-001',
  number: 'INV-2024-001',
  customer: 'John Smith',
  items: [
    { name: 'Haircut', price: 45.00 },
    { name: 'Beard Trim', price: 25.00 },
    { name: 'Hair Wash', price: 15.00 },
  ],
  subtotal: 85.00,
  tax: 8.50,
  total: 93.50,
};

export default function TestTyroPage() {
  const [paymentAmount, setPaymentAmount] = useState(mockInvoice.total);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pairingStatus, setPairingStatus] = useState<string>('Not paired');
  const [merchantId, setMerchantId] = useState(process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID || '189815');
  const [terminalId, setTerminalId] = useState('TEST_TID');

  const handlePairing = () => {
    console.log('🔘 Pair button clicked!');
    console.log('🔍 Checking SDK availability...');
    console.log('window.TYRO:', window.TYRO);
    console.log('window.TYRO?.IClientWithUI:', window.TYRO?.IClientWithUI);
    
    if (!window.TYRO?.IClientWithUI) {
      console.error('❌ Tyro SDK not available');
      alert('Tyro SDK not available - check console for details');
      setPairingStatus('❌ SDK not available');
      return;
    }

    console.log('✅ SDK available, attempting to create client...');
    console.log('API Key:', process.env.NEXT_PUBLIC_TYRO_API_KEY?.substring(0, 8) + '...');
    console.log('Merchant ID:', merchantId);
    console.log('Terminal ID:', terminalId);

    try {
      const client = new window.TYRO.IClientWithUI(process.env.NEXT_PUBLIC_TYRO_API_KEY || '', {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0'
      });

      console.log('✅ Client created successfully:', client);
      setPairingStatus('Initiating pairing...');
      
      console.log('🔗 Calling pairTerminal with:', { merchantId, terminalId });
      
      client.pairTerminal(merchantId, terminalId, (response: any) => {
        console.log('📞 Pairing response received:', response);
        setPairingStatus(`Pairing: ${response.status} - ${response.message || 'No message'}`);
      });
      
      console.log('🕐 Pairing request sent, waiting for response...');
      
    } catch (error) {
      console.error('❌ Pairing error:', error);
      setPairingStatus(`Pairing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`Pairing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePayment = () => {
    if (!window.TYRO?.IClientWithUI) {
      alert('Tyro SDK not available');
      return;
    }

    try {
      const client = new window.TYRO.IClientWithUI(process.env.NEXT_PUBLIC_TYRO_API_KEY || '', {
        posProductVendor: 'HEYA',
        posProductName: 'HEYA POS',
        posProductVersion: '2.0.0'
      });

      const amountInCents = (paymentAmount * 100).toString();
      
      client.initiatePurchase(
        {
          amount: amountInCents,
          cashout: 0,
          integratedReceipt: true,
          enableSurcharge: true
        },
        {
          transactionCompleteCallback: (response: any) => {
            console.log('Payment response:', response);
            setTransactions(prev => [response, ...prev]);
            alert(`Payment ${response.result}: ${response.transactionReference}`);
          },
          receiptCallback: (receipt: any) => {
            console.log('Receipt:', receipt);
          }
        }
      );
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    margin: '10px 0',
    backgroundColor: '#fff'
  };

  const buttonStyle = {
    padding: '10px 20px',
    margin: '5px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white'
  };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: 'white'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Tyro Integration Test</h1>
      <p>Test Tyro EFTPOS terminal integration</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Mock Checkout */}
        <div style={cardStyle}>
          <h2>🛒 Mock Checkout</h2>
          <p>Simulate a customer checkout with Tyro payment</p>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Invoice: {mockInvoice.number}</strong>
            <br />
            <em>Customer: {mockInvoice.customer}</em>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            {mockInvoice.items.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.name}</span>
                <span>{formatCurrency(item.price)}</span>
              </div>
            ))}
            <hr />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(mockInvoice.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (GST)</span>
              <span>{formatCurrency(mockInvoice.tax)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total</span>
              <span>{formatCurrency(mockInvoice.total)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Payment Amount: </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0.01"
              style={{ padding: '5px', marginLeft: '10px', width: '100px' }}
            />
          </div>

          <button 
            onClick={handlePayment}
            style={successButtonStyle}
          >
            💳 Pay {formatCurrency(paymentAmount)} (Tyro)
          </button>
        </div>

        {/* Configuration & Status */}
        <div>
          {/* Terminal Configuration */}
          <div style={cardStyle}>
            <h2>⚙️ Terminal Configuration</h2>
            <p><strong>Status:</strong> {pairingStatus}</p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Merchant ID:
              </label>
              <input
                type="text"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="Enter Merchant ID"
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
                placeholder="Enter Terminal ID"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            <button 
              onClick={handlePairing}
              style={primaryButtonStyle}
              disabled={!merchantId.trim() || !terminalId.trim()}
            >
              Pair Terminal ({merchantId} / {terminalId})
            </button>
            
            <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              <p>• Ensure Tyro terminal is powered on</p>
              <p>• Enter your actual Terminal ID (not TEST_TID)</p>
              <p>• Confirm pairing on the physical terminal</p>
            </div>
          </div>

          {/* Transaction History */}
          <div style={cardStyle}>
            <h2>🧾 Transaction History</h2>
            <p>Recent Tyro transactions ({transactions.length})</p>
            
            {transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                No transactions yet. Process a payment to see it here.
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {transactions.slice(0, 5).map((transaction, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '10px',
                    border: '1px solid #eee',
                    borderRadius: '5px',
                    margin: '5px 0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {formatCurrency((transaction.baseAmount || 0) / 100)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Ref: {transaction.transactionReference}
                      </div>
                    </div>
                    <span style={{ 
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: transaction.result === 'APPROVED' ? '#d4edda' : '#f8d7da',
                      color: transaction.result === 'APPROVED' ? '#155724' : '#721c24'
                    }}>
                      {transaction.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SDK Status */}
      <div style={cardStyle}>
        <h2>🔧 SDK Status & Debug Info</h2>
        <div style={{ marginBottom: '10px' }}>
          <strong>Tyro SDK:</strong> {
            typeof window !== 'undefined' && window.TYRO?.IClientWithUI 
              ? '✅ Loaded' 
              : '❌ Not Available'
          }
        </div>
        <div style={{ fontSize: '14px', fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
          <div><strong>API Key:</strong> {process.env.NEXT_PUBLIC_TYRO_API_KEY?.substring(0, 8) + '...' || '❌ Not set'}</div>
          <div><strong>Merchant ID:</strong> {process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID || '❌ Not set'}</div>
          <div><strong>Environment:</strong> {process.env.NEXT_PUBLIC_TYRO_ENVIRONMENT || 'Not set'}</div>
          <div><strong>Window.TYRO:</strong> {typeof window !== 'undefined' ? (window.TYRO ? '✅ Present' : '❌ Missing') : 'Checking...'}</div>
          <div><strong>IClientWithUI:</strong> {typeof window !== 'undefined' ? (window.TYRO?.IClientWithUI ? '✅ Present' : '❌ Missing') : 'Checking...'}</div>
        </div>
        <p style={{ marginTop: '10px' }}><em>Check browser console (F12) for detailed logs when clicking buttons</em></p>
      </div>
    </div>
  );
}