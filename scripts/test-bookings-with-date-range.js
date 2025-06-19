#!/usr/bin/env node

/**
 * Test bookings API with date range parameters
 */

async function testBookingsWithDateRange() {
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

    // Step 2: Test with date range (like the fixed client will do)
    console.log('\nTesting bookings endpoint with date range...');
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const params = new URLSearchParams({
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
      limit: '100'
    });
    
    const bookingsResponse = await fetch(`http://localhost:3000/api/v2/bookings?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${bookingsResponse.status}`);
    
    if (!bookingsResponse.ok) {
      const errorText = await bookingsResponse.text();
      console.log('Error response:', errorText);
    } else {
      const bookingsData = await bookingsResponse.json();
      console.log('\nSuccess! Bookings response:');
      console.log('- Type:', typeof bookingsData);
      console.log('- Total bookings:', bookingsData.total || bookingsData.length);
      console.log('- Data length:', bookingsData.data?.length || bookingsData.length);
      
      if (bookingsData.data && bookingsData.data.length > 0) {
        console.log('\nFirst booking:', JSON.stringify(bookingsData.data[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBookingsWithDateRange();