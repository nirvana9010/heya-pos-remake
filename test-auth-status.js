const axios = require('axios');

async function testAuthAndBookings() {
  console.log('Testing authentication and bookings API...\n');

  try {
    // 1. Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, got token:', token.substring(0, 20) + '...');
    
    // 2. Test bookings endpoint
    console.log('\n2. Testing bookings endpoint...');
    const bookingsResponse = await axios.get('http://localhost:3000/api/v1/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days future
      }
    });
    
    console.log('✓ Bookings loaded successfully:', bookingsResponse.data.data.length, 'bookings');
    
    // 3. Test staff endpoint
    console.log('\n3. Testing staff endpoint...');
    const staffResponse = await axios.get('http://localhost:3000/api/v1/staff', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✓ Staff loaded successfully:', staffResponse.data.length, 'staff members');
    
    // 4. Test services endpoint
    console.log('\n4. Testing services endpoint...');
    const servicesResponse = await axios.get('http://localhost:3000/api/v1/services', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✓ Services loaded successfully:', servicesResponse.data.data.length, 'services');
    
    console.log('\n✅ All API endpoints are working correctly!');
    console.log('\nIf the calendar is failing, the issue might be:');
    console.log('- Browser has stale/invalid token');
    console.log('- CORS issue');
    console.log('- Frontend error handling issue');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAuthAndBookings();