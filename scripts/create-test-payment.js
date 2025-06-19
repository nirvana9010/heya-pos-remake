#!/usr/bin/env node

const fetch = require('node-fetch');

// Helper function to format currency
const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;

async function createTestPayment() {
  console.log('=== Creating Test Payment for Payments Page ===\n');

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

    // Step 2: Get required data
    console.log('\n📋 Step 2: Getting required data...');
    
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
    
    const service = servicesData.data[0];
    const customer = customersData.data[0];
    const staff = staffData[0];
    const location = locationsData[0];

    console.log('✅ Data retrieved');
    console.log(`   Service: ${service.name} (${formatCurrency(service.price)})`);
    console.log(`   Customer: ${customer.firstName} ${customer.lastName}`);
    console.log(`   Staff: ${staff.firstName} ${staff.lastName}`);
    console.log(`   Location: ${location.name || location.id}`);

    // Step 3: Create a new booking for future date to avoid conflicts
    console.log('\n📅 Step 3: Creating new booking...');
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 3 + Math.floor(Math.random() * 5)); // 3-8 days from now
    startTime.setHours(8 + Math.floor(Math.random() * 10)); // Random hour between 8 AM and 6 PM
    startTime.setMinutes([0, 15, 30, 45][Math.floor(Math.random() * 4)]); // Random quarter hour
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
        notes: 'Test booking for payments page demonstration'
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
    console.log(`   Current State: ${orderData.state}`);

    // Step 7: Update order state following proper transitions (DRAFT → LOCKED → PENDING_PAYMENT)
    if (orderData.state === 'DRAFT') {
      console.log('\n🔄 Step 7a: Updating order state from DRAFT to LOCKED...');
      const lockResponse = await fetch(`http://localhost:3000/api/v1/payments/orders/${orderId}/state`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'LOCKED'
        })
      });

      if (!lockResponse.ok) {
        const errorText = await lockResponse.text();
        throw new Error(`Order lock failed: ${lockResponse.status} - ${errorText}`);
      }

      const lockedOrder = await lockResponse.json();
      console.log('✅ Order locked');
      console.log(`   State: ${lockedOrder.state}`);
      
      console.log('\n🔄 Step 7b: Updating order state from LOCKED to PENDING_PAYMENT...');
      const pendingResponse = await fetch(`http://localhost:3000/api/v1/payments/orders/${orderId}/state`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'PENDING_PAYMENT'
        })
      });

      if (!pendingResponse.ok) {
        const errorText = await pendingResponse.text();
        throw new Error(`Order pending payment failed: ${pendingResponse.status} - ${errorText}`);
      }

      const pendingOrder = await pendingResponse.json();
      console.log('✅ Order ready for payment');
      console.log(`   Final State: ${pendingOrder.state}`);
      
    } else if (orderData.state === 'LOCKED') {
      console.log('\n🔄 Step 7: Updating order state from LOCKED to PENDING_PAYMENT...');
      const pendingResponse = await fetch(`http://localhost:3000/api/v1/payments/orders/${orderId}/state`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'PENDING_PAYMENT'
        })
      });

      if (!pendingResponse.ok) {
        const errorText = await pendingResponse.text();
        throw new Error(`Order pending payment failed: ${pendingResponse.status} - ${errorText}`);
      }

      const pendingOrder = await pendingResponse.json();
      console.log('✅ Order ready for payment');
      console.log(`   Final State: ${pendingOrder.state}`);
      
    } else if (orderData.state === 'PENDING_PAYMENT' || orderData.state === 'PARTIALLY_PAID') {
      console.log(`✅ Order is already in payable state: ${orderData.state}`);
    } else {
      throw new Error(`Order is in non-payable state: ${orderData.state}`);
    }

    // Step 8: Process payment with random tip
    console.log('\n💳 Step 8: Processing payment...');
    const tipAmount = [5, 10, 15, 20][Math.floor(Math.random() * 4)]; // Random tip
    const paymentMethod = Math.random() > 0.5 ? 'CASH' : 'CARD'; // Random payment method
    
    const paymentResponse = await fetch('http://localhost:3000/api/v1/payments/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: orderId,
        amount: parseFloat(orderData.totalAmount),
        method: paymentMethod,
        tipAmount: tipAmount
      })
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Payment processing failed: ${paymentResponse.status} - ${errorText}`);
    }

    const paymentData = await paymentResponse.json();
    console.log('   Raw payment response:', JSON.stringify(paymentData, null, 2));
    
    // Handle the nested payment structure from the API response
    const payment = paymentData.payment || paymentData;
    paymentId = payment.id;
    console.log('✅ Payment processed');
    console.log(`   Payment ID: ${paymentId}`);
    console.log(`   Amount: ${formatCurrency(payment.amount || 0)}`);
    console.log(`   Tip: ${formatCurrency(payment.tipAmount || 0)}`);
    console.log(`   Method: ${payment.paymentMethod}`);
    console.log(`   Status: ${payment.status}`);

    // Step 9: Verify payment appears in payments list
    console.log('\n🔍 Step 9: Verifying payment appears in payments list...');
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

    // Step 10: Test the merchant app payments page
    console.log('\n🌐 Step 10: Testing payments page displays new payment...');
    const merchantPageResponse = await fetch('http://localhost:3002/payments');
    
    if (!merchantPageResponse.ok) {
      throw new Error(`Merchant payments page failed: ${merchantPageResponse.status}`);
    }

    console.log('✅ Merchant payments page loads successfully');

    // Summary
    console.log('\n🎉 TEST PAYMENT CREATED SUCCESSFULLY!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Booking: ${bookingData.id.slice(0, 8)}... (${new Date(bookingData.startTime).toLocaleDateString()})`);
    console.log(`   ✅ Order: ${orderData.orderNumber}`);
    console.log(`   ✅ Payment: ${formatCurrency(payment.amount)} + ${formatCurrency(payment.tipAmount || 0)} tip`);
    console.log(`   ✅ Method: ${payment.paymentMethod}`);
    console.log(`   ✅ Customer: ${customer.firstName} ${customer.lastName}`);
    console.log(`   ✅ Service: ${service.name}`);
    console.log('\n💡 The payment is now visible in the Payments page!');
    console.log('   Go to http://localhost:3002/payments to see the new transaction.');

  } catch (error) {
    console.error('\n❌ Test payment creation failed:', error.message);
    
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
createTestPayment();