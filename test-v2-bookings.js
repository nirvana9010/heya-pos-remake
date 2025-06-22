const axios = require('axios');

async function testV2Bookings() {
  console.log('Testing V2 bookings endpoint...\n');

  try {
    // 1. Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, got token:', token.substring(0, 20) + '...');
    
    // 2. Test V2 bookings endpoint
    console.log('\n2. Testing V2 bookings endpoint...');
    const bookingsResponse = await axios.get('http://localhost:3000/api/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days future
        limit: 100
      }
    });
    
    console.log('✓ V2 Bookings loaded successfully!');
    console.log('Response structure:', {
      hasData: !!bookingsResponse.data.data,
      dataLength: bookingsResponse.data.data?.length,
      hasPagination: !!bookingsResponse.data.pagination,
      totalCount: bookingsResponse.data.pagination?.total
    });
    
    if (bookingsResponse.data.data && bookingsResponse.data.data.length > 0) {
      console.log('\nFirst booking:', JSON.stringify(bookingsResponse.data.data[0], null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testV2Bookings();