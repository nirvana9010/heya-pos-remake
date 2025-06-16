#!/usr/bin/env ts-node

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = 'http://localhost:3000/api';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  console.log('🔐 Logging in...');
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    username: 'HAMILTON',
    password: 'demo123',
  });
  return response.data.user;
}

async function verifyPin(userId: string) {
  console.log('🔑 Verifying PIN...');
  const response = await axios.post(`${API_BASE_URL}/auth/verify-pin`, {
    userId,
    pin: '1234',
  });
  return response.data.access_token;
}

async function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function testV2BookingCreation(token: string) {
  console.log('\n📝 Testing V2 Booking Creation...');
  
  try {
    // Create a booking using V2 endpoint
    const bookingData = {
      customerId: '3a6b4e87-7530-4f65-a15a-789012345678', // Jane Smith
      staffId: '550e8400-e29b-41d4-a716-446655440005', // Sarah Johnson
      serviceId: '7f2d9b88-3a45-4e69-a234-567890123456', // Women's Haircut
      locationId: '9a7b6c5d-4321-0fed-cba9-876543210987', // Hamilton Main
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      notes: 'Test booking via V2 API with transactional script pattern',
    };

    console.log('Creating booking with data:', bookingData);

    const response = await axios.post(
      `${API_BASE_URL}/v2/bookings`,
      bookingData,
      { headers: await getHeaders(token) }
    );

    console.log('✅ V2 Booking created successfully:', {
      id: response.data.id,
      bookingNumber: response.data.bookingNumber,
      status: response.data.status,
      startTime: response.data.startTime,
      endTime: response.data.endTime,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ V2 Booking creation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testConcurrentBookings(token: string) {
  console.log('\n🔄 Testing Concurrent Booking Prevention...');
  
  const bookingData = {
    customerId: '3a6b4e87-7530-4f65-a15a-789012345678',
    staffId: '550e8400-e29b-41d4-a716-446655440005',
    serviceId: '7f2d9b88-3a45-4e69-a234-567890123456',
    locationId: '9a7b6c5d-4321-0fed-cba9-876543210987',
    startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    notes: 'Concurrent test booking',
  };

  // Create two concurrent booking requests
  const promises = [
    axios.post(`${API_BASE_URL}/v2/bookings`, bookingData, { headers: await getHeaders(token) }),
    axios.post(`${API_BASE_URL}/v2/bookings`, bookingData, { headers: await getHeaders(token) }),
  ];

  try {
    const results = await Promise.allSettled(promises);
    
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        console.log(`✅ Request ${index + 1} succeeded:`, result.value.data.bookingNumber);
      } else {
        failureCount++;
        const error = result.reason.response?.data;
        console.log(`❌ Request ${index + 1} failed:`, error?.message || result.reason.message);
        if (error?.conflicts) {
          console.log('   Conflicts detected:', error.conflicts);
        }
      }
    });

    console.log(`\nSummary: ${successCount} succeeded, ${failureCount} failed`);
    
    if (successCount === 1 && failureCount === 1) {
      console.log('✅ Concurrent booking prevention working correctly!');
    } else {
      console.error('❌ Unexpected result - concurrent booking prevention may not be working');
    }
  } catch (error) {
    console.error('❌ Concurrent test failed:', error);
  }
}

async function testBookingStateTransitions(token: string, bookingId: string) {
  console.log('\n🔄 Testing Booking State Transitions...');
  
  const headers = await getHeaders(token);
  
  try {
    // Start the booking
    console.log('Starting booking...');
    const startResponse = await axios.patch(
      `${API_BASE_URL}/v2/bookings/${bookingId}/start`,
      {},
      { headers }
    );
    console.log('✅ Booking started:', startResponse.data.status);

    // Complete the booking
    console.log('Completing booking...');
    const completeResponse = await axios.patch(
      `${API_BASE_URL}/v2/bookings/${bookingId}/complete`,
      {},
      { headers }
    );
    console.log('✅ Booking completed:', completeResponse.data.status);

    // Try to start again (should fail)
    console.log('Trying to start completed booking (should fail)...');
    try {
      await axios.patch(
        `${API_BASE_URL}/v2/bookings/${bookingId}/start`,
        {},
        { headers }
      );
      console.error('❌ Should not be able to start a completed booking!');
    } catch (error: any) {
      console.log('✅ Correctly prevented invalid state transition');
    }
  } catch (error: any) {
    console.error('❌ State transition test failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Testing Bounded Context Implementation with Transactional Script Pattern\n');

  try {
    // Login and get token
    const user = await login();
    const token = await verifyPin(user.id);
    console.log('✅ Authentication successful\n');

    // Test V2 booking creation
    const booking = await testV2BookingCreation(token);

    // Test concurrent bookings
    await testConcurrentBookings(token);

    // Test state transitions
    await testBookingStateTransitions(token, booking.id);

    console.log('\n✅ All tests completed!');
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);