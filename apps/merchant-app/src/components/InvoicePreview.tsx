import React from 'react';
import { formatDate } from '@heya-pos/utils';

interface InvoicePreviewProps {
  payment: any;
  merchant: any;
  location?: any;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ payment, merchant, location }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'card-tyro': 'Credit Card',
      'CASH': 'Cash',
      'CARD': 'Credit Card',
    };
    return methods[method] || method;
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      'completed': 'Paid',
      'pending': 'Pending',
      'failed': 'Failed',
      'refunded': 'Refunded',
    };
    return statuses[status.toLowerCase()] || status;
  };

  // Calculate order details
  const order = payment.order || {};
  const items = order.items || [];
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const discount = order.discount || 0;
  const surcharge = order.surcharge || 0;
  const tax = order.tax || 0;
  const total = payment.amount || subtotal - discount + surcharge + tax;

  return (
    <div className="invoice-preview" style={{ 
      padding: '40px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      color: '#000',
      lineHeight: '1.6'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#000' }}>INVOICE</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#000' }}>{merchant?.name || 'Business Name'}</h2>
            {location && (
              <>
                <p style={{ margin: '5px 0' }}>{location.address}</p>
                <p style={{ margin: '5px 0' }}>{location.city}, {location.state} {location.zipCode}</p>
              </>
            )}
            {merchant?.phone && <p style={{ margin: '5px 0' }}>Phone: {merchant.phone}</p>}
            {merchant?.email && <p style={{ margin: '5px 0' }}>Email: {merchant.email}</p>}
            {merchant?.abn && <p style={{ margin: '5px 0' }}>ABN: {merchant.abn}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Invoice #{payment.invoiceNumber}
            </p>
            <p style={{ margin: '5px 0' }}>
              Date: {formatDate(payment.processedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000' }}>Bill To:</h3>
        <p style={{ margin: '5px 0', fontWeight: 'bold' }}>{payment.customerName}</p>
        {payment.customerPhone && <p style={{ margin: '5px 0' }}>Phone: {payment.customerPhone}</p>}
        {payment.customerEmail && <p style={{ margin: '5px 0' }}>Email: {payment.customerEmail}</p>}
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item: any, index: number) => (
            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{item.name || 'Service'}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity || 1}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(item.price * (item.quantity || 1))}</td>
            </tr>
          )) : (
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{payment.serviceName || payment.type || 'Service'}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>1</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(payment.amount)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(payment.amount)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '300px' }}>
            {items.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span>Discount:</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                {surcharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span>Surcharge:</span>
                    <span>{formatCurrency(surcharge)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span>Tax:</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
              </>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '10px 0', 
              borderTop: '2px solid #000',
              fontSize: '20px',
              fontWeight: 'bold' 
            }}>
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        marginBottom: '30px' 
      }}>
        <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000' }}>Payment Information</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Payment Method:</span>
          <span>{getPaymentMethodLabel(payment.method)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Payment Status:</span>
          <span style={{ fontWeight: 'bold', color: payment.status === 'completed' ? 'green' : '#000' }}>
            {getStatusLabel(payment.status)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Transaction Date:</span>
          <span>{new Date(payment.processedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '20px', 
        borderTop: '1px solid #ddd',
        fontSize: '14px',
        color: '#666' 
      }}>
        <p>Thank you for your business!</p>
        {merchant?.website && <p>Visit us at: {merchant.website}</p>}
      </div>
    </div>
  );
};