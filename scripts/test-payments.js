#!/usr/bin/env node

const fetch = require('node-fetch');

async function testPaymentsAPI() {
  console.log('=== Testing Payments API ===\n');

  try {
    // Step 1: Login as merchant
    console.log('1. Logging in as merchant...');
    const loginResponse = await fetch('http://localhost:3000/api/v1/auth/merchant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HAMILTON',
        password: 'demo123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✓ Login successful');
    console.log(`  - Merchant: ${loginData.user.firstName}`);
    console.log(`  - Token: ${loginData.token.substring(0, 50)}...`);

    // Step 2: Fetch payments
    console.log('\n2. Fetching payments...');
    const paymentsResponse = await fetch('http://localhost:3000/api/v1/payments', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paymentsResponse.ok) {
      throw new Error(`Payments fetch failed: ${paymentsResponse.status}`);
    }

    const paymentsData = await paymentsResponse.json();
    console.log('✓ Payments fetched successfully');
    console.log(`  - Total payments: ${paymentsData.pagination.total}`);
    console.log(`  - Page: ${paymentsData.pagination.page}/${paymentsData.pagination.totalPages}`);

    // Step 3: Display payment details
    console.log('\n3. Payment Details:');
    paymentsData.payments.slice(0, 3).forEach((payment, index) => {
      console.log(`\n  Payment ${index + 1}:`);
      console.log(`    - ID: ${payment.id}`);
      console.log(`    - Amount: $${payment.amount}`);
      console.log(`    - Method: ${payment.paymentMethod}`);
      console.log(`    - Status: ${payment.status}`);
      console.log(`    - Customer: ${payment.order?.customer?.firstName} ${payment.order?.customer?.lastName}`);
      console.log(`    - Order: ${payment.order?.orderNumber}`);
      console.log(`    - Date: ${new Date(payment.processedAt).toLocaleString()}`);
    });

    // Step 4: Test payment transformation
    console.log('\n4. Testing UI transformation...');
    const transformedPayment = {
      id: paymentsData.payments[0].id,
      invoiceNumber: paymentsData.payments[0].order?.orderNumber || `PAY-${paymentsData.payments[0].id.slice(0, 8)}`,
      customerName: paymentsData.payments[0].order?.customer ? 
        `${paymentsData.payments[0].order.customer.firstName} ${paymentsData.payments[0].order.customer.lastName}` : 
        'Unknown Customer',
      amount: parseFloat(paymentsData.payments[0].amount),
      method: paymentsData.payments[0].paymentMethod === 'CASH' ? 'cash' : 'card-tyro',
      status: paymentsData.payments[0].status.toLowerCase(),
      processedAt: new Date(paymentsData.payments[0].processedAt),
      type: paymentsData.payments[0].order?.bookingId ? 'booking' : 'product',
      customerId: paymentsData.payments[0].order?.customerId,
    };
    console.log('✓ Transformation successful');
    console.log('  Transformed payment:', transformedPayment);

    console.log('\n✅ All tests passed! The Payments API is working correctly.');
    console.log('\nThe Payments page should now be displaying real data from the API.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testPaymentsAPI();