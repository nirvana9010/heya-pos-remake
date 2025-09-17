#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testBookingConflict() {
  console.log('=== Testing Booking Conflict Error Handling ===\n');

  try {
    // Step 1: Login
    console.log('1. Logging in as Zen Wellness...');
    const loginResponse = await axios.post(`${API_BASE}/v1/auth/merchant/login`, {
      email: 'lukas.tn90@gmail.com',
      password: 'demo456'
    });

    const token = loginResponse.data.token;
    const merchantId = loginResponse.data.merchantId;
    console.log('   ✓ Logged in successfully');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   MerchantId: ${merchantId}\n`);

    // Configure axios with auth token
    const api = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: Get bookings to find James Wilson's 9:30pm booking
    console.log('2. Fetching bookings...');
    const bookingsResponse = await api.get('/v2/bookings');
    const bookingsData = bookingsResponse.data;

    // Handle different response structures
    const bookings = Array.isArray(bookingsData) ? bookingsData :
                    (bookingsData.data || bookingsData.bookings || []);

    console.log(`   Found ${bookings.length} bookings`);

    // Find 2 bookings on today to test with
    const todayBookings = bookings.filter(b => {
      const bookingDate = new Date(b.startTime);
      const today = new Date();
      return bookingDate.toDateString() === today.toDateString();
    });

    if (todayBookings.length < 2) {
      console.log('   ✗ Need at least 2 bookings on today to test conflict');
      console.log('   Today\'s bookings:', todayBookings.map(b => ({
        customer: b.customerName || b.customer?.name,
        time: new Date(b.startTime).toLocaleString()
      })));

      // Fall back to any 2 bookings
      if (bookings.length < 2) {
        console.log('   ✗ Need at least 2 bookings total');
        return;
      }
      console.log('\n   Using first 2 available bookings instead...');
    }

    // Pick the first booking and try to move it to the same time as another
    const bookingsToUse = todayBookings.length >= 2 ? todayBookings : bookings;
    const bookingToUpdate = bookingsToUse[0];
    const conflictingBooking = bookingsToUse[1];

    console.log('   ✓ Found bookings to test with:');
    console.log(`     Booking to update:`);
    console.log(`       ID: ${bookingToUpdate.id}`);
    console.log(`       Customer: ${bookingToUpdate.customerName || bookingToUpdate.customer?.name}`);
    console.log(`       Current time: ${new Date(bookingToUpdate.startTime).toLocaleString()}`);
    console.log(`       Services: ${bookingToUpdate.services?.map(s => s.name || s.serviceName).join(', ')}`);

    console.log(`\n     Conflicting booking:`);
    console.log(`       Customer: ${conflictingBooking.customerName || conflictingBooking.customer?.name}`);
    console.log(`       Time: ${new Date(conflictingBooking.startTime).toLocaleString()}\n`);

    // Step 3: Try to update to a conflicting time
    console.log('3. Attempting to update first booking to same time as second (creating conflict)...');

    // Use the same time as the conflicting booking
    const conflictingTime = new Date(conflictingBooking.startTime);

    console.log(`   Original time: ${bookingToUpdate.startTime}`);
    console.log(`   New time (conflict): ${conflictingTime.toISOString()}`);

    const updateData = {
      startTime: conflictingTime.toISOString(),
      staffId: bookingToUpdate.staffId || bookingToUpdate.provider?.id,
      services: bookingToUpdate.services?.map(s => ({
        serviceId: s.serviceId || s.id,
        staffId: s.staffId || bookingToUpdate.staffId || bookingToUpdate.provider?.id,
        price: s.price || s.adjustedPrice,
        duration: s.duration
      })),
      notes: bookingToUpdate.notes
    };

    console.log('\n   Update payload:', JSON.stringify(updateData, null, 2));

    try {
      console.log('\n   Sending PATCH request...');
      const updateResponse = await api.patch(`/v2/bookings/${bookingToUpdate.id}`, updateData);

      // If we get here, the update succeeded (shouldn't happen if there's a conflict)
      console.log('\n   ⚠️ UNEXPECTED: Update succeeded!');
      console.log('   Response:', JSON.stringify(updateResponse.data, null, 2));

    } catch (error) {
      console.log('\n   ✓ Update failed as expected (conflict detected)');

      if (error.response) {
        console.log('\n   Error Response Details:');
        console.log('   Status:', error.response.status);
        console.log('   Status Text:', error.response.statusText);
        console.log('   Headers:', error.response.headers);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));

        // Check what the actual error structure is
        const errorData = error.response.data;
        console.log('\n   Error Structure Analysis:');
        console.log('   - Has statusCode?', !!errorData.statusCode);
        console.log('   - Has errorCode?', !!errorData.errorCode);
        console.log('   - Has message?', !!errorData.message);
        console.log('   - Has errorMessage?', !!errorData.errorMessage);
        console.log('   - Message content:', errorData.message || errorData.errorMessage);

      } else {
        console.log('   Network or other error:', error.message);
      }
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testBookingConflict();