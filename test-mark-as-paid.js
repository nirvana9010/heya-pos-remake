#!/usr/bin/env node

/**
 * Test script to verify simplified "Mark as Paid" functionality
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      email: 'lukas.tn90@gmail.com',
      password: 'demo456'
    });
    
    authToken = response.data.token;
    console.log('✅ Logged in successfully');
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
      console.log(`   Amount: $${unpaidBooking.totalAmount || unpaidBooking.price}`);
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

async function markBookingAsPaid(bookingId, amount) {
  try {
    console.log('\n💰 Marking booking as paid...');
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Amount: $${amount}`);
    
    const response = await axios.post(
      `${API_URL}/v2/bookings/${bookingId}/mark-paid`,
      {
        paymentMethod: 'CASH',
        amount: amount
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('✅ Booking marked as paid successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to mark as paid:', error.response?.data || error.message);
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
    console.log('📊 Booking status:');
    console.log(`   Payment Status: ${booking.paymentStatus || 'UNPAID'}`);
    console.log(`   Paid Amount: $${booking.paidAmount || 0}`);
    console.log(`   Payment Method: ${booking.paymentMethod || 'N/A'}`);
    
    return booking;
  } catch (error) {
    console.error('❌ Failed to check booking:', error.response?.data || error.message);
    return null;
  }
}

async function runTest() {
  console.log('🧪 Simplified Mark as Paid Test');
  console.log('================================\n');
  
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
  
  const amount = booking.totalAmount || booking.price || 0;
  
  // Step 3: Mark booking as paid
  const result = await markBookingAsPaid(booking.id, amount);
  if (!result) {
    console.log('\n❌ Test failed: Could not mark booking as paid');
    process.exit(1);
  }
  
  // Step 4: Verify immediately
  const updatedBooking = await checkBookingStatus(booking.id);
  if (!updatedBooking) {
    console.log('\n❌ Test failed: Could not fetch updated booking');
    process.exit(1);
  }
  
  // Step 5: Check results
  console.log('\n🎯 Test Results:');
  if (updatedBooking.paymentStatus === 'PAID' && updatedBooking.paidAmount > 0) {
    console.log('✅ SUCCESS: Booking was marked as paid immediately!');
    console.log('   No complex order creation or async sync needed.');
    console.log('   The simplified approach works perfectly!');
  } else {
    console.log('❌ FAILURE: Booking was NOT marked as paid');
    console.log(`   Status: ${updatedBooking.paymentStatus}, Amount: ${updatedBooking.paidAmount}`);
  }
}

// Run the test
runTest().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});