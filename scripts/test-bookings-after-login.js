#!/usr/bin/env node

/**
 * Test bookings API endpoint immediately after login
 */

async function testBookingsAfterLogin() {
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
    console.log('Token received:', token ? 'Yes' : 'No');

    // Step 2: Immediately test bookings endpoint (like the prefetch does)
    console.log('\nTesting bookings endpoint with date param...');
    const today = new Date().toISOString();
    
    const bookingsResponse = await fetch(`http://localhost:3000/api/v2/bookings?date=${today}&limit=1000`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${bookingsResponse.status}`);
    console.log(`Response headers:`, Object.fromEntries(bookingsResponse.headers.entries()));
    
    if (!bookingsResponse.ok) {
      const errorText = await bookingsResponse.text();
      console.log('Error response body:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Parsed error:', errorJson);
      } catch (e) {
        console.log('Error response is not JSON');
      }
    } else {
      const bookingsData = await bookingsResponse.json();
      console.log('\nBookings response:');
      console.log('- Type:', typeof bookingsData);
      console.log('- Is Array:', Array.isArray(bookingsData));
      console.log('- Has data property:', !!bookingsData.data);
      console.log('- Length:', bookingsData.length || bookingsData.data?.length || 0);
      
      if (bookingsData.data) {
        console.log('- Pagination info:', {
          total: bookingsData.total,
          page: bookingsData.page,
          limit: bookingsData.limit
        });
      }
    }

    // Step 3: Test without date param
    console.log('\n\nTesting bookings endpoint without date param...');
    const bookingsResponse2 = await fetch('http://localhost:3000/api/v2/bookings?limit=1000', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${bookingsResponse2.status}`);
    
    if (bookingsResponse2.ok) {
      const data = await bookingsResponse2.json();
      console.log('Success - got', data.length || data.data?.length || 0, 'bookings');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBookingsAfterLogin();