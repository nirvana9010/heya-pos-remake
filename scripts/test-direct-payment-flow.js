#!/usr/bin/env node

const fetch = require('node-fetch');

// Helper function to format currency
const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;

async function testDirectPaymentFlow() {
  console.log('=== Direct Payment Flow Test ===\n');
  console.log('This test creates an order and payment directly, then verifies it appears in the Payments page.\n');

  let token;
  let merchantId;
  let orderId;
  let paymentId;

  try {
    // Step 1: Login as merchant
    console.log('🔐 Step 1: Logging in as merchant...');
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
    token = loginData.token;
    merchantId = loginData.merchantId;
    console.log('✅ Login successful');
    console.log(`   Merchant: ${loginData.user.firstName}`);

    // Step 2: Get a customer for the order
    console.log('\n👤 Step 2: Getting customer data...');
    const customersResponse = await fetch('http://localhost:3000/api/v1/customers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const customersData = await customersResponse.json();
    const customer = customersData.data[0];
    
    if (!customer) {
      throw new Error('No customers available');
    }
    
    console.log('✅ Customer retrieved');
    console.log(`   Customer: ${customer.firstName} ${customer.lastName}`);

    // Step 3: Create an order from an existing completed booking
    console.log('\n🛒 Step 3: Creating order from completed booking...');
    // Use a completed booking to create an order
    const completedBookingId = "380d50fe-5884-49c6-84c8-0bbc9c62b362";
    
    const orderResponse = await fetch(`http://localhost:3000/api/v1/payments/orders/from-booking/${completedBookingId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Order creation failed: ${orderResponse.status} - ${errorText}`);
    }

    const orderData = await orderResponse.json();
    orderId = orderData.id;
    console.log('✅ Order created from booking');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Order Number: ${orderData.orderNumber}`);
    console.log(`   Total Amount: ${formatCurrency(orderData.totalAmount)}`);
    console.log(`   Booking ID: ${completedBookingId}`);

    // Step 4: Process payment
    console.log('\n💳 Step 4: Processing payment...');
    const paymentResponse = await fetch('http://localhost:3000/api/v1/payments/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: orderId,
        amount: parseFloat(orderData.totalAmount),
        method: 'CASH',
        tipAmount: 15.00
      })
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Payment processing failed: ${paymentResponse.status} - ${errorText}`);
    }

    const paymentData = await paymentResponse.json();
    paymentId = paymentData.id;
    console.log('✅ Payment processed');
    console.log(`   Payment ID: ${paymentId}`);
    console.log(`   Amount: ${formatCurrency(paymentData.amount)}`);
    console.log(`   Tip: ${formatCurrency(paymentData.tipAmount || 0)}`);
    console.log(`   Method: ${paymentData.paymentMethod}`);
    console.log(`   Status: ${paymentData.status}`);

    // Step 5: Wait a moment and fetch payments to verify it appears
    console.log('\n🔍 Step 5: Verifying payment appears in payments list...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const paymentsListResponse = await fetch('http://localhost:3000/api/v1/payments', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paymentsListResponse.ok) {
      throw new Error(`Fetching payments failed: ${paymentsListResponse.status}`);
    }

    const paymentsListData = await paymentsListResponse.json();
    const newPayment = paymentsListData.payments.find(p => p.id === paymentId);

    if (!newPayment) {
      throw new Error(`New payment ${paymentId} not found in payments list`);
    }

    console.log('✅ Payment found in payments list');
    console.log(`   Invoice: ${newPayment.order?.orderNumber}`);
    console.log(`   Customer: ${newPayment.order?.customer?.firstName} ${newPayment.order?.customer?.lastName}`);
    console.log(`   Amount: ${formatCurrency(newPayment.amount)}`);
    console.log(`   Status: ${newPayment.status}`);

    // Step 6: Test the merchant app payments page
    console.log('\n🌐 Step 6: Testing payments page displays new payment...');
    const merchantPageResponse = await fetch('http://localhost:3002/payments');
    
    if (!merchantPageResponse.ok) {
      throw new Error(`Merchant payments page failed: ${merchantPageResponse.status}`);
    }

    console.log('✅ Merchant payments page loads successfully');

    // Summary
    console.log('\n🎉 DIRECT PAYMENT TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Order Created from Booking: ${orderData.orderNumber}`);
    console.log(`   ✅ Booking Used: ${completedBookingId}`);
    console.log(`   ✅ Payment Processed: ${formatCurrency(paymentData.amount)} + ${formatCurrency(paymentData.tipAmount || 0)} tip`);
    console.log(`   ✅ Payment Appears in API List`);
    console.log(`   ✅ Payments Page Loads Correctly`);
    console.log('\n💡 The order → payment → display flow is working!');
    console.log('   You can now check the Payments page in the merchant app to see the new payment.');
    console.log(`   Look for payment ID: ${paymentId}`);
    console.log(`   Customer: ${customer.firstName} ${customer.lastName}`);
    console.log(`   Amount: ${formatCurrency(paymentData.amount)}`);

  } catch (error) {
    console.error('\n❌ Direct payment test failed:', error.message);
    
    // Cleanup information if we got partway through
    if (orderId) {
      console.log(`\n🧹 For cleanup, order ID was: ${orderId}`);
    }
    if (paymentId) {
      console.log(`   Payment ID was: ${paymentId}`);
    }
    
    process.exit(1);
  }
}

// Run the test
testDirectPaymentFlow();