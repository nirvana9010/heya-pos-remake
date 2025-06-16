const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
const V2_BASE_URL = 'http://localhost:3000/api/v2';

async function login() {
  const response = await axios.post(`${API_BASE_URL}/auth/merchant/login`, {
    username: 'HAMILTON',
    password: 'demo123',
  });
  return response.data;
}

async function testBookingLifecycle(token) {
  console.log('\n🔄 Testing Booking Lifecycle (Create → Start → Complete)...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Create a booking
  console.log('1️⃣ Creating booking...');
  const bookingData = {
    customerId: '7acc76ca-692c-4a59-a8b1-225072278938', // Jane Smith
    staffId: '30f897a4-9faf-4980-a356-d79c59502b18', // Emma Williams
    serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88', // Swedish Massage
    locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550', // Hamilton Main
    startTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10 hours from now
    notes: 'Test booking lifecycle',
  };

  let booking;
  try {
    const response = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    booking = response.data;
    console.log(`✅ Booking created: ${booking.bookingNumber}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   ID: ${booking.id}\n`);
  } catch (error) {
    console.error('❌ Failed to create booking:', error.response?.data?.message);
    return;
  }

  // 2. Start the booking
  console.log('2️⃣ Starting booking...');
  try {
    const response = await axios.patch(`${V2_BASE_URL}/bookings/${booking.id}/start`, {}, { headers });
    const updatedBooking = response.data;
    console.log(`✅ Booking started`);
    console.log(`   Status: ${updatedBooking.status}\n`);
  } catch (error) {
    console.error('❌ Failed to start booking:', error.response?.data?.message);
  }

  // 3. Complete the booking
  console.log('3️⃣ Completing booking...');
  try {
    const response = await axios.patch(`${V2_BASE_URL}/bookings/${booking.id}/complete`, {}, { headers });
    const completedBooking = response.data;
    console.log(`✅ Booking completed`);
    console.log(`   Status: ${completedBooking.status}\n`);
  } catch (error) {
    console.error('❌ Failed to complete booking:', error.response?.data?.message);
  }

  // 4. Try invalid transition (complete → start)
  console.log('4️⃣ Testing invalid transition (complete → start)...');
  try {
    await axios.patch(`${V2_BASE_URL}/bookings/${booking.id}/start`, {}, { headers });
    console.error('❌ FAIL: Should not allow starting a completed booking!');
  } catch (error) {
    console.log('✅ Correctly prevented invalid state transition');
    console.log(`   Error: ${error.response?.data?.message}\n`);
  }

  return booking;
}

async function testBookingCancellation(token) {
  console.log('\n🔄 Testing Booking Cancellation...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Create a booking to cancel
  const bookingData = {
    customerId: '7acc76ca-692c-4a59-a8b1-225072278938',
    staffId: '30f897a4-9faf-4980-a356-d79c59502b18',
    serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88',
    locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550',
    startTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    notes: 'Test cancellation',
  };

  let booking;
  try {
    const response = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    booking = response.data;
    console.log(`✅ Booking created: ${booking.bookingNumber}\n`);
  } catch (error) {
    console.error('❌ Failed to create booking:', error.response?.data?.message);
    return;
  }

  // Cancel the booking
  console.log('🚫 Cancelling booking...');
  try {
    const response = await axios.patch(
      `${V2_BASE_URL}/bookings/${booking.id}/cancel`,
      { reason: 'Customer requested cancellation' },
      { headers }
    );
    const cancelledBooking = response.data;
    console.log(`✅ Booking cancelled`);
    console.log(`   Status: ${cancelledBooking.status}`);
    console.log(`   Reason: ${cancelledBooking.cancellationReason}\n`);
  } catch (error) {
    console.error('❌ Failed to cancel booking:', error.response?.data?.message);
  }
}

async function testBookingRescheduling(token) {
  console.log('\n🔄 Testing Booking Rescheduling...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Create a booking to reschedule - use a different time to avoid conflicts
  const originalTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const bookingData = {
    customerId: '7acc76ca-692c-4a59-a8b1-225072278938',
    staffId: '30f897a4-9faf-4980-a356-d79c59502b18',
    serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88',
    locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550',
    startTime: originalTime.toISOString(),
    notes: 'Test rescheduling',
  };

  let booking;
  try {
    const response = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    booking = response.data;
    console.log(`✅ Booking created: ${booking.bookingNumber}`);
    console.log(`   Original time: ${new Date(booking.startTime).toLocaleTimeString()}\n`);
  } catch (error) {
    console.error('❌ Failed to create booking:', error.response?.data?.message);
    return;
  }

  // Reschedule to 1 hour later
  const newTime = new Date(originalTime.getTime() + 60 * 60 * 1000);
  console.log('📅 Rescheduling booking...');
  console.log(`   New time: ${newTime.toLocaleTimeString()}`);
  
  try {
    const response = await axios.patch(
      `${V2_BASE_URL}/bookings/${booking.id}`,
      { startTime: newTime.toISOString() },
      { headers }
    );
    const rescheduledBooking = response.data;
    console.log(`✅ Booking rescheduled`);
    console.log(`   New start time: ${new Date(rescheduledBooking.startTime).toLocaleTimeString()}\n`);
  } catch (error) {
    console.error('❌ Failed to reschedule booking:', error.response?.data?.message);
  }

  // Try to reschedule to a conflicting time (should fail)
  console.log('📅 Testing conflict detection on reschedule...');
  // Create another booking at the original time to create a conflict
  const conflictBookingData = {
    ...bookingData,
    customerId: 'c6a89d28-c0a5-4b70-8421-32e1efa0138e', // Mary Davis
    startTime: originalTime.toISOString(),
  };
  
  try {
    await axios.post(`${V2_BASE_URL}/bookings`, conflictBookingData, { headers });
  } catch (error) {
    // Ignore if this fails
  }
  
  const conflictingTime = originalTime; // Try to move back to original time
  
  try {
    await axios.patch(
      `${V2_BASE_URL}/bookings/${booking.id}`,
      { startTime: conflictingTime.toISOString() },
      { headers }
    );
    console.error('❌ FAIL: Should have detected time conflict!');
  } catch (error) {
    console.log('✅ Correctly detected scheduling conflict');
    console.log(`   Error: ${error.response?.data?.message}\n`);
  }
}

async function main() {
  console.log('🚀 Testing Booking Update Operations\n');

  try {
    // Login
    console.log('🔐 Authenticating...');
    const authData = await login();
    const token = authData.token;
    console.log('✅ Authentication successful');

    // Test booking lifecycle
    await testBookingLifecycle(token);

    // Test cancellation
    await testBookingCancellation(token);

    // Test rescheduling
    await testBookingRescheduling(token);

    console.log('\n✅ All update tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main().catch(console.error);