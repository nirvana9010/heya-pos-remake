#!/usr/bin/env node

/**
 * Test script to verify that marking an order as paid syncs to the booking
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let authToken = null;
let merchantId = null;

// Test credentials
const TEST_EMAIL = 'lukas.tn90@gmail.com';
const TEST_PASSWORD = 'demo456';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    merchantId = response.data.merchantId;
    
    console.log('✅ Logged in successfully');
    console.log(`   Merchant ID: ${merchantId}`);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function findUnpaidBooking() {
  try {
    console.log('\n🔍 Finding an unpaid booking...');
    const response = await axios.get(`${API_URL}/v2/bookings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const bookings = response.data.data || response.data;
    const unpaidBooking = bookings.find(b => 
      b.paymentStatus !== 'PAID' && 
      b.status !== 'CANCELLED' &&
      (!b.paidAmount || b.paidAmount === 0)
    );
    
    if (unpaidBooking) {
      console.log('✅ Found unpaid booking:');
      console.log(`   ID: ${unpaidBooking.id}`);
      console.log(`   Customer: ${unpaidBooking.customerName}`);
      console.log(`   Service: ${unpaidBooking.serviceName}`);
      console.log(`   Amount: $${unpaidBooking.totalAmount || unpaidBooking.price}`);
      console.log(`   Payment Status: ${unpaidBooking.paymentStatus || 'UNPAID'}`);
      console.log(`   Paid Amount: $${unpaidBooking.paidAmount || 0}`);
      return unpaidBooking;
    } else {
      console.log('❌ No unpaid bookings found');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to fetch bookings:', error.response?.data || error.message);
    return null;
  }
}

async function createOrderFromBooking(bookingId) {
  try {
    console.log('\n📦 Creating order from booking...');
    const response = await axios.post(`${API_URL}/v1/payments/orders/from-booking/${bookingId}`, 
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const order = response.data;
    console.log('✅ Order created/retrieved:');
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   State: ${order.state}`);
    console.log(`   Balance Due: $${order.balanceDue}`);
    return order;
  } catch (error) {
    console.error('❌ Failed to create order:', error.response?.data || error.message);
    return null;
  }
}

async function lockOrder(orderId) {
  try {
    console.log('\n🔒 Locking order...');
    const response = await axios.post(`${API_URL}/v1/payments/orders/${orderId}/state`, 
      { state: 'LOCKED' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ Order locked successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to lock order:', error.response?.data || error.message);
    return null;
  }
}

async function processPayment(orderId, amount) {
  try {
    console.log('\n💳 Processing payment...');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Amount: $${amount}`);
    
    const response = await axios.post(`${API_URL}/v1/payments/process`, 
      {
        orderId: orderId,
        amount: amount,
        method: 'CASH',
        metadata: {
          cashReceived: amount
        }
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ Payment processed successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Payment failed:', error.response?.data || error.message);
    return null;
  }
}

async function checkBookingStatus(bookingId) {
  try {
    console.log('\n🔄 Checking booking status...');
    const response = await axios.get(`${API_URL}/v2/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const booking = response.data.data || response.data;
    console.log('📊 Current booking status:');
    console.log(`   Payment Status: ${booking.paymentStatus || 'UNPAID'}`);
    console.log(`   Paid Amount: $${booking.paidAmount || 0}`);
    console.log(`   Payment Method: ${booking.paymentMethod || 'N/A'}`);
    console.log(`   Paid At: ${booking.paidAt || 'N/A'}`);
    
    return booking;
  } catch (error) {
    console.error('❌ Failed to check booking:', error.response?.data || error.message);
    return null;
  }
}

async function runTest() {
  console.log('🧪 Payment Sync Test Script');
  console.log('==========================\n');
  
  // Step 1: Login
  if (!await login()) {
    console.log('\n❌ Test failed: Could not login');
    process.exit(1);
  }
  
  // Step 2: Find an unpaid booking
  const booking = await findUnpaidBooking();
  if (!booking) {
    console.log('\n❌ Test failed: No unpaid booking to test with');
    process.exit(1);
  }
  
  // Step 3: Create order from booking
  const order = await createOrderFromBooking(booking.id);
  if (!order) {
    console.log('\n❌ Test failed: Could not create order');
    process.exit(1);
  }
  
  // Step 4: Lock the order if it's in DRAFT state
  if (order.state === 'DRAFT') {
    const lockedOrder = await lockOrder(order.id);
    if (!lockedOrder) {
      console.log('\n❌ Test failed: Could not lock order');
      process.exit(1);
    }
  }
  
  // Step 5: Process payment
  const payment = await processPayment(order.id, order.balanceDue);
  if (!payment) {
    console.log('\n❌ Test failed: Payment processing failed');
    process.exit(1);
  }
  
  // Step 6: Wait for backend to sync
  console.log('\n⏳ Waiting 3 seconds for backend sync...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Also try a longer wait in case it's async
  console.log('⏳ Waiting additional 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 6: Check if booking was updated
  const updatedBooking = await checkBookingStatus(booking.id);
  if (!updatedBooking) {
    console.log('\n❌ Test failed: Could not fetch updated booking');
    process.exit(1);
  }
  
  // Step 7: Verify the sync worked
  console.log('\n🎯 Test Results:');
  if (updatedBooking.paymentStatus === 'PAID' && updatedBooking.paidAmount > 0) {
    console.log('✅ SUCCESS: Booking was synced with payment!');
    console.log('   The backend sync is working correctly.');
  } else {
    console.log('❌ FAILURE: Booking was NOT synced with payment!');
    console.log('   The backend sync is NOT working.');
    console.log('\n   Expected: paymentStatus = PAID, paidAmount > 0');
    console.log(`   Actual: paymentStatus = ${updatedBooking.paymentStatus}, paidAmount = ${updatedBooking.paidAmount}`);
  }
}

// Run the test
runTest().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});