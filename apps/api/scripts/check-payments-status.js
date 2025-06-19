#!/usr/bin/env node

/**
 * Check payment and order statuses in the system
 */

async function checkPaymentStatus() {
  try {
    // Step 1: Login
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:3000/api/v1/auth/merchant/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'HAMILTON',
        password: 'demo123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful');

    // Step 2: Get all payments
    console.log('\nFetching payments...');
    const paymentsResponse = await fetch('http://localhost:3000/api/v1/payments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!paymentsResponse.ok) {
      console.log('Failed to fetch payments:', paymentsResponse.status);
      return;
    }

    const paymentsData = await paymentsResponse.json();
    console.log(`\nFound ${paymentsData.payments.length} payments`);

    // Group by status
    const statusCounts = {};
    const orderStates = {};
    
    paymentsData.payments.forEach(payment => {
      // Count payment statuses
      statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;
      
      // Count order states
      if (payment.order) {
        orderStates[payment.order.state] = (orderStates[payment.order.state] || 0) + 1;
      }
    });

    console.log('\nPayment statuses:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nOrder states:');
    Object.entries(orderStates).forEach(([state, count]) => {
      console.log(`  ${state}: ${count}`);
    });

    // Check for PAID or COMPLETE orders
    const eligiblePayments = paymentsData.payments.filter(payment => 
      payment.order && ['PAID', 'COMPLETE'].includes(payment.order.state)
    );

    console.log(`\nPayments with PAID/COMPLETE orders: ${eligiblePayments.length}`);
    
    if (eligiblePayments.length > 0) {
      console.log('\nSample eligible payments:');
      eligiblePayments.slice(0, 3).forEach(payment => {
        console.log(`  - Payment ${payment.id.slice(0, 8)}... | Amount: $${payment.amount} | Order state: ${payment.order.state} | Status: ${payment.status}`);
      });
    }

    // Show a few sample payments
    console.log('\n\nSample payments (first 5):');
    paymentsData.payments.slice(0, 5).forEach(payment => {
      console.log(`\nPayment ${payment.id.slice(0, 8)}...`);
      console.log(`  Amount: $${payment.amount}`);
      console.log(`  Status: ${payment.status}`);
      console.log(`  Method: ${payment.paymentMethod}`);
      console.log(`  Processed: ${payment.processedAt}`);
      if (payment.order) {
        console.log(`  Order Number: ${payment.order.orderNumber}`);
        console.log(`  Order State: ${payment.order.state}`);
        console.log(`  Order Type: ${payment.order.type}`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPaymentStatus();