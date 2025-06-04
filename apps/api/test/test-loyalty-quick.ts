#\!/usr/bin/env npx ts-node

import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const EXISTING_CUSTOMER_ID = 'cmbgdvybl0001vo8wdyow8n0f'; // John Doe

let authToken: string;

async function apiCall(method: string, path: string, data?: any) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  
  const response = await axios({ method, url: `${API_URL}${path}`, data, headers });
  return response.data;
}

async function test() {
  try {
    // Login
    const login = await apiCall('POST', '/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    authToken = login.token;
    console.log('✓ Logged in');

    // Check customer loyalty
    const loyalty = await apiCall('GET', `/loyalty/customers/${EXISTING_CUSTOMER_ID}`);
    console.log('\nCustomer loyalty status:', loyalty);

    // Create a booking
    const booking = await apiCall('POST', '/bookings', {
      customerId: EXISTING_CUSTOMER_ID,
      locationId: 'cmbcxfd9z0007vopjy4jj9igu',
      services: [{
        serviceId: 'cmbcxfdhs0009vopjwkgdv0g1',
        staffId: 'cmbcxfdq10017vopjyuqsjt8f'
      }],
      startTime: new Date(Date.now() + 3600000).toISOString(),
      notes: 'Test booking for loyalty'
    });
    console.log('\n✓ Booking created:', booking.id);

    // Complete the booking
    await apiCall('PATCH', `/bookings/${booking.id}`, { status: 'COMPLETED' });
    console.log('✓ Booking completed');

    // Check updated loyalty
    const updated = await apiCall('GET', `/loyalty/customers/${EXISTING_CUSTOMER_ID}`);
    console.log('\nUpdated loyalty status:', updated);

    // Test manual adjustment
    const adjust = await apiCall('POST', '/loyalty/adjust', {
      customerId: EXISTING_CUSTOMER_ID,
      visits: 8,
      reason: 'Testing near redemption'
    });
    console.log('\n✓ Adjusted visits (+8)');

    // Final check
    const final = await apiCall('GET', `/loyalty/customers/${EXISTING_CUSTOMER_ID}`);
    console.log('\nFinal loyalty status:', final);

    console.log('\n✅ All tests passed\!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

test();
