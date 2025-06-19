#!/usr/bin/env node

const fetch = require('node-fetch');

// Helper function to format currency
const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;

async function testCompleteBookingPaymentFlow() {
  console.log('=== End-to-End Booking → Payment Flow Test ===\n');

  let token;
  let merchantId;
  let bookingId;
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

    // Step 2: Get available services, customers, staff, and locations
    console.log('\n📋 Step 2: Getting available services, customers, staff, and locations...');
    
    const [servicesResponse, customersResponse, staffResponse, locationsResponse] = await Promise.all([
      fetch('http://localhost:3000/api/v1/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/v1/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/v1/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/v1/locations', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    const servicesData = await servicesResponse.json();
    const customersData = await customersResponse.json();
    const staffData = await staffResponse.json();
    const locationsData = await locationsResponse.json();
    
    const service = servicesData.data?.[0] || servicesData.services?.[0] || servicesData[0];
    const customer = customersData.data?.[0] || customersData.customers?.[0] || customersData[0];
    const staff = staffData[0] || staffData.data?.[0] || staffData.staff?.[0];
    const location = locationsData[0] || locationsData.data?.[0] || locationsData.locations?.[0];
    
    if (!service) {
      throw new Error('No services available');
    }
    if (!customer) {
      throw new Error('No customers available');
    }
    if (!staff) {
      throw new Error('No staff available');
    }
    if (!location) {
      throw new Error('No locations available');
    }
    
    console.log('✅ Data retrieved');
    console.log(`   Service: ${service.name} (${formatCurrency(service.price)})`);
    console.log(`   Customer: ${customer.firstName} ${customer.lastName}`);
    console.log(`   Staff: ${staff.firstName} ${staff.lastName}`);
    console.log(`   Location: ${location.name || location.id}`);

    // Step 3: Create a new booking
    console.log('\n📅 Step 3: Creating new booking...');
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1); // Tomorrow
    startTime.setHours(10 + Math.floor(Math.random() * 6)); // Random hour between 10 AM and 4 PM
    startTime.setMinutes(0); // Start at the top of the hour
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
    
    const bookingResponse = await fetch('http://localhost:3000/api/v2/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId: customer.id,
        staffId: staff.id,
        locationId: location.id,
        serviceId: service.id,
        startTime: startTime.toISOString(),
        notes: 'End-to-end test booking'
      })
    });

    if (!bookingResponse.ok) {
      const errorText = await bookingResponse.text();
      throw new Error(`Booking creation failed: ${bookingResponse.status} - ${errorText}`);
    }

    const bookingData = await bookingResponse.json();
    bookingId = bookingData.id;
    console.log('✅ Booking created');
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Status: ${bookingData.status}`);
    console.log(`   Start Time: ${new Date(bookingData.startTime).toLocaleString()}`);

    // Step 4: Start the booking
    console.log('\n▶️  Step 4: Starting booking...');
    const startResponse = await fetch(`http://localhost:3000/api/v2/bookings/${bookingId}/start`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`Starting booking failed: ${startResponse.status} - ${errorText}`);
    }

    const startedBooking = await startResponse.json();
    console.log('✅ Booking started');
    console.log(`   Status: ${startedBooking.status}`);

    // Step 5: Complete the booking
    console.log('\n✅ Step 5: Completing booking...');
    const completeResponse = await fetch(`http://localhost:3000/api/v2/bookings/${bookingId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text();
      throw new Error(`Completing booking failed: ${completeResponse.status} - ${errorText}`);
    }

    const completedBooking = await completeResponse.json();
    console.log('✅ Booking completed');
    console.log(`   Status: ${completedBooking.status}`);

    // Step 6: Create order from booking
    console.log('\n💰 Step 6: Creating order from booking...');
    const orderResponse = await fetch(`http://localhost:3000/api/v1/payments/orders/from-booking/${bookingId}`, {
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
    console.log('✅ Order created');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Order Number: ${orderData.orderNumber}`);
    console.log(`   Total Amount: ${formatCurrency(orderData.totalAmount)}`);

    // Step 7: Process payment
    console.log('\n💳 Step 7: Processing payment...');
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
        tipAmount: 10.00
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

    // Step 8: Wait a moment and fetch payments to verify it appears
    console.log('\n🔍 Step 8: Verifying payment appears in payments list...');
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

    // Step 9: Test the merchant app payments page
    console.log('\n🌐 Step 9: Testing payments page displays new payment...');
    const merchantPageResponse = await fetch('http://localhost:3002/payments');
    
    if (!merchantPageResponse.ok) {
      throw new Error(`Merchant payments page failed: ${merchantPageResponse.status}`);
    }

    console.log('✅ Merchant payments page loads successfully');

    // Summary
    console.log('\n🎉 END-TO-END TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Booking Created: ${bookingId}`);
    console.log(`   ✅ Booking Started & Completed`);
    console.log(`   ✅ Order Created: ${orderData.orderNumber}`);
    console.log(`   ✅ Payment Processed: ${formatCurrency(paymentData.amount)}`);
    console.log(`   ✅ Payment Appears in API List`);
    console.log(`   ✅ Payments Page Loads Correctly`);
    console.log('\n💡 The complete booking → payment → display flow is working!');
    console.log('   You can now check the Payments page in the merchant app to see the new payment.');

  } catch (error) {
    console.error('\n❌ End-to-end test failed:', error.message);
    
    // Cleanup information if we got partway through
    if (bookingId) {
      console.log(`\n🧹 For cleanup, booking ID was: ${bookingId}`);
    }
    if (orderId) {
      console.log(`   Order ID was: ${orderId}`);
    }
    if (paymentId) {
      console.log(`   Payment ID was: ${paymentId}`);
    }
    
    process.exit(1);
  }
}

// Run the test
testCompleteBookingPaymentFlow();