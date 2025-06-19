#!/usr/bin/env node

const fetch = require('node-fetch');

// Helper function to format currency
const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;

async function createSimplePayment() {
  console.log('=== Creating Simple Test Payment ===\n');
  console.log('This script creates a manual order and processes payment to populate the Payments page.\n');

  let token;
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
    console.log('✅ Login successful');

    // Step 2: Get customer data
    console.log('\n👤 Step 2: Getting customer data...');
    const customersResponse = await fetch('http://localhost:3000/api/v1/customers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const customersData = await customersResponse.json();
    const customer = customersData.data[0];
    
    console.log('✅ Customer retrieved');
    console.log(`   Customer: ${customer.firstName} ${customer.lastName}`);

    // Step 3: Create a manual order (without booking)
    console.log('\n🛒 Step 3: Creating manual order...');
    const orderResponse = await fetch('http://localhost:3000/api/v1/payments/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId: customer.id
        // No bookingId - creates manual order
      })
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.log('❌ Direct order creation failed, trying alternative approach...');
      console.log(`   Error: ${errorText}`);
      
      // Alternative: Create order from an existing CONFIRMED booking
      console.log('\n🔄 Step 3b: Finding existing CONFIRMED booking...');
      const bookingsResponse = await fetch('http://localhost:3000/api/v2/bookings?status=CONFIRMED&limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!bookingsResponse.ok) {
        throw new Error(`Failed to fetch bookings: ${bookingsResponse.status}`);
      }
      
      const bookingsData = await bookingsResponse.json();
      const confirmedBooking = bookingsData.data.find(b => b.status === 'CONFIRMED');
      
      if (!confirmedBooking) {
        throw new Error('No CONFIRMED bookings available to create order from');
      }
      
      console.log(`✅ Found CONFIRMED booking: ${confirmedBooking.id.slice(0, 8)}...`);
      console.log(`   Customer: ${confirmedBooking.customerName}`);
      console.log(`   Service: ${confirmedBooking.serviceName}`);
      
      // Create order from the confirmed booking
      const orderFromBookingResponse = await fetch(`http://localhost:3000/api/v1/payments/orders/from-booking/${confirmedBooking.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!orderFromBookingResponse.ok) {
        const orderErrorText = await orderFromBookingResponse.text();
        throw new Error(`Order from booking failed: ${orderFromBookingResponse.status} - ${orderErrorText}`);
      }
      
      const orderData = await orderFromBookingResponse.json();
      orderId = orderData.id;
      
      console.log('✅ Order created from booking');
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Order Number: ${orderData.orderNumber}`);
      console.log(`   Total Amount: ${formatCurrency(orderData.totalAmount)}`);
      console.log(`   Current State: ${orderData.state}`);
      
      // If order is already paid, skip payment
      if (orderData.state === 'PAID') {
        console.log('⚠️  Order is already paid, skipping payment step');
        console.log('✅ This order should already appear in the Payments page');
        
        // Check if payment exists
        const paymentsListResponse = await fetch('http://localhost:3000/api/v1/payments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (paymentsListResponse.ok) {
          const paymentsListData = await paymentsListResponse.json();
          const existingPayment = paymentsListData.payments.find(p => p.orderId === orderId);
          
          if (existingPayment) {
            console.log('✅ Payment found in payments list');
            console.log(`   Payment ID: ${existingPayment.id}`);
            console.log(`   Amount: ${formatCurrency(existingPayment.amount)}`);
            console.log(`   Status: ${existingPayment.status}`);
          }
        }
        
        console.log('\n🌐 Testing payments page...');
        const merchantPageResponse = await fetch('http://localhost:3002/payments');
        
        if (merchantPageResponse.ok) {
          console.log('✅ Merchant payments page loads successfully');
          console.log('\n💡 Go to http://localhost:3002/payments to see the payment data!');
        }
        
        return;
      }
      
      // Continue with payment processing for unpaid orders
      const finalOrderData = orderData;
      
      // Step 4: Update order state following proper transitions
      if (finalOrderData.state === 'DRAFT') {
        console.log('\n🔄 Step 4a: Updating order state from DRAFT to LOCKED...');
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
        
        console.log('\n🔄 Step 4b: Updating order state from LOCKED to PENDING_PAYMENT...');
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
        
      } else if (finalOrderData.state === 'LOCKED') {
        console.log('\n🔄 Step 4: Updating order state from LOCKED to PENDING_PAYMENT...');
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
        
      } else if (finalOrderData.state === 'PENDING_PAYMENT' || 
                 finalOrderData.state === 'PARTIALLY_PAID') {
        console.log(`✅ Order is already in payable state: ${finalOrderData.state}`);
      } else {
        throw new Error(`Order is in non-payable state: ${finalOrderData.state}`);
      }

      // Step 5: Process payment
      console.log('\n💳 Step 5: Processing payment...');
      const tipAmount = [0, 5, 10, 15, 20][Math.floor(Math.random() * 5)]; // Random tip including no tip
      const paymentMethod = Math.random() > 0.6 ? 'CASH' : 'CARD'; // Favor cash slightly
      
      const paymentResponse = await fetch('http://localhost:3000/api/v1/payments/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: orderId,
          amount: parseFloat(finalOrderData.totalAmount),
          method: paymentMethod,
          tipAmount: tipAmount
        })
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        throw new Error(`Payment processing failed: ${paymentResponse.status} - ${errorText}`);
      }

      const paymentData = await paymentResponse.json();
      console.log('✅ Payment processed successfully');
      console.log('   Raw payment response:', JSON.stringify(paymentData, null, 2));
      
      // Handle the nested payment structure from the API response
      const payment = paymentData.payment || paymentData;
      paymentId = payment.id;
      console.log(`   Payment ID: ${paymentId}`);
      console.log(`   Amount: ${formatCurrency(payment.amount || 0)}`);
      console.log(`   Tip: ${formatCurrency(payment.tipAmount || 0)}`);
      console.log(`   Method: ${payment.paymentMethod}`);
      console.log(`   Status: ${payment.status}`);

      // Step 6: Verify payment appears in payments list
      console.log('\n🔍 Step 6: Verifying payment in payments list...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const paymentsListResponse = await fetch('http://localhost:3000/api/v1/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!paymentsListResponse.ok) {
        throw new Error(`Fetching payments failed: ${paymentsListResponse.status}`);
      }

      const paymentsListData = await paymentsListResponse.json();
      const newPayment = paymentsListData.payments.find(p => p.id === paymentId);

      if (!newPayment) {
        throw new Error(`New payment ${paymentId} not found in payments list`);
      }

      console.log('✅ Payment confirmed in payments list');
      console.log(`   Invoice: ${newPayment.order?.orderNumber}`);
      console.log(`   Customer: ${newPayment.order?.customer?.firstName} ${newPayment.order?.customer?.lastName}`);

      // Step 7: Test the merchant app payments page
      console.log('\n🌐 Step 7: Testing payments page...');
      const merchantPageResponse = await fetch('http://localhost:3002/payments');
      
      if (!merchantPageResponse.ok) {
        throw new Error(`Merchant payments page failed: ${merchantPageResponse.status}`);
      }

      console.log('✅ Merchant payments page loads successfully');

      // Summary
      console.log('\n🎉 TEST PAYMENT CREATED SUCCESSFULLY!');
      console.log('\n📊 Summary:');
      console.log(`   ✅ Order: ${orderData.orderNumber}`);
      console.log(`   ✅ Payment: ${formatCurrency(payment.amount)} + ${formatCurrency(payment.tipAmount || 0)} tip`);
      console.log(`   ✅ Method: ${payment.paymentMethod}`);
      console.log(`   ✅ Customer: ${confirmedBooking.customerName}`);
      console.log(`   ✅ Service: ${confirmedBooking.serviceName}`);
      console.log('\n💡 The payment is now visible in the Payments page!');
      console.log('   Go to http://localhost:3002/payments to see the new transaction.');
      
      return;
    }

    // If direct order creation worked, continue here...
    const orderData = await orderResponse.json();
    orderId = orderData.id;
    console.log('✅ Manual order created');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Order Number: ${orderData.orderNumber}`);
    
    // Continue with rest of flow...

  } catch (error) {
    console.error('\n❌ Simple payment creation failed:', error.message);
    
    if (orderId) {
      console.log(`\n🧹 Order ID for cleanup: ${orderId}`);
    }
    if (paymentId) {
      console.log(`   Payment ID: ${paymentId}`);
    }
    
    process.exit(1);
  }
}

// Run the test
createSimplePayment();