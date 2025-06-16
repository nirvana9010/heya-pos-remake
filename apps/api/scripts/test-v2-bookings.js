const axios = require('axios');

async function testV2Bookings() {
  try {
    // First login
    console.log('1. Testing merchant login...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, got token');
    
    // Then test V2 bookings
    console.log('\n2. Testing V2 bookings endpoint...');
    // Test with date range parameters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 days ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now
    
    const bookingsResponse = await axios.get('http://localhost:3000/api/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100
      }
    });
    
    console.log('✓ V2 bookings request successful');
    console.log('Full response:', JSON.stringify(bookingsResponse.data, null, 2));
    
    const items = bookingsResponse.data.data || bookingsResponse.data.items || [];
    console.log(`Total bookings: ${items.length}`);
    
    if (items.length > 0) {
      const firstBooking = items[0];
      console.log('\nFirst booking details:');
      console.log('- ID:', firstBooking.id);
      console.log('- Customer:', firstBooking.customerName);
      console.log('- Staff ID:', firstBooking.staffId);
      console.log('- Staff Name:', firstBooking.staffName);
      console.log('- Service:', firstBooking.serviceName);
      console.log('- Status:', firstBooking.status);
      console.log('- Start Time:', firstBooking.startTime);
      
      // Check if staffId exists
      if (firstBooking.staffId) {
        console.log('\n✓ SUCCESS: staffId field is present in V2 response!');
      } else {
        console.log('\n✗ ERROR: staffId field is missing from V2 response!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response?.status === 404) {
      console.log('\nHint: Make sure the API is running and the endpoints are correctly configured.');
    }
  }
}

testV2Bookings();