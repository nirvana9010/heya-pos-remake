#!/usr/bin/env node

const axios = require('axios');
const BASE_URL = 'http://localhost:3000/api';

async function testTimezoneHandling() {
  try {
    console.log('Testing Timezone Handling...\n');
    
    // Test 1: Create a booking for June 13th
    console.log('1. Creating booking for June 13th, 2025 at 2:00 PM...');
    const bookingData = {
      customerName: 'Timezone Test Customer',
      customerEmail: 'timezone@test.com',
      customerPhone: '0412345678',
      serviceId: '', // Will be filled from available services
      date: '2025-06-13',
      startTime: '14:00',
      notes: 'Testing timezone handling'
    };
    
    // First get available services
    const servicesResponse = await axios.get(`${BASE_URL}/public/services`);
    const services = servicesResponse.data.data;
    if (services.length > 0) {
      bookingData.serviceId = services[0].id;
      console.log(`Using service: ${services[0].name}`);
    } else {
      throw new Error('No services available');
    }
    
    // Create the booking
    const createResponse = await axios.post(`${BASE_URL}/public/bookings`, bookingData);
    const createdBooking = createResponse.data;
    console.log(`\nBooking created successfully!`);
    console.log(`Full response:`, JSON.stringify(createdBooking, null, 2));
    console.log(`Booking Number: ${createdBooking.bookingNumber}`);
    console.log(`Date: ${createdBooking.date}`);
    console.log(`Start Time: ${createdBooking.startTime}`);
    console.log(`End Time: ${createdBooking.endTime}`);
    
    // Test 2: Retrieve the booking and check if it's still June 13th
    console.log('\n2. Retrieving booking to verify date...');
    const getResponse = await axios.get(`${BASE_URL}/public/bookings/${createdBooking.id}`);
    const retrievedBooking = getResponse.data;
    console.log(`Retrieved Date: ${retrievedBooking.date}`);
    console.log(`Retrieved Start Time: ${retrievedBooking.startTime}`);
    
    // Verify the date
    if (retrievedBooking.date === '2025-06-13') {
      console.log('\n✅ SUCCESS: Booking date is correctly preserved as June 13th!');
    } else {
      console.log(`\n❌ FAILURE: Booking date changed to ${retrievedBooking.date}`);
    }
    
    // Test 3: Check availability for June 13th
    console.log('\n3. Checking availability for June 13th...');
    const availabilityResponse = await axios.post(`${BASE_URL}/public/bookings/check-availability`, {
      date: '2025-06-13',
      serviceId: bookingData.serviceId
    });
    
    const slots = availabilityResponse.data.slots;
    const slot2pm = slots.find(s => s.time === '14:00');
    if (slot2pm && !slot2pm.available) {
      console.log('✅ 2:00 PM slot correctly shows as unavailable');
    } else {
      console.log('❌ 2:00 PM slot availability incorrect');
    }
    
    // Test 4: Login as merchant and check bookings
    console.log('\n4. Logging in as merchant to check booking display...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const accessToken = loginResponse.data.accessToken;
    
    // Get bookings for June 13th
    const merchantBookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      params: { date: '2025-06-13' },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const merchantBookings = merchantBookingsResponse.data.data;
    const testBooking = merchantBookings.find(b => b.bookingNumber === createdBooking.bookingNumber);
    
    if (testBooking) {
      console.log(`\nFound booking in merchant view:`);
      console.log(`Display Date: ${testBooking.displayDate}`);
      console.log(`Display Start Time: ${testBooking.displayStartTime}`);
      console.log(`Display End Time: ${testBooking.displayEndTime}`);
      
      if (testBooking.displayDate && testBooking.displayDate.includes('13/06')) {
        console.log('\n✅ SUCCESS: Merchant view shows correct date (June 13th)!');
      } else {
        console.log(`\n❌ FAILURE: Merchant view shows incorrect date`);
      }
    } else {
      console.log('\n❌ Could not find booking in merchant view');
    }
    
    console.log('\n✅ Timezone handling test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testTimezoneHandling();