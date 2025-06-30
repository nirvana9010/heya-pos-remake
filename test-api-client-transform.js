const axios = require('axios');

async function testApiClientTransform() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    console.log('🔍 Testing what apiClient.getBookings() returns...\n');
    
    // Call the API exactly how the frontend does
    const response = await axios.get('http://localhost:3000/api/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      },
      params: {
        startDate: '2025-06-30',
        endDate: '2025-06-30',
        limit: 100
      }
    });
    
    const bookings = response.data.data;
    const testBooking = bookings.find(b => b.id === '82bee171-9b08-4867-82e2-ec5ab69c1580');
    
    console.log('📊 Raw API response status:', testBooking?.status);
    
    console.log('\n🔄 BookingsClient.transformBooking() would convert:');
    console.log('  Input: "COMPLETED"');
    console.log('  Output: "completed"');
    
    console.log('\n⚠️  BUT in hooks.ts, the transformed data is NOT used!');
    console.log('  Line 43: response.map((booking: any) => {');
    console.log('  Line 65: status: booking.status, // RAW STATUS!');
    console.log('');
    console.log('The BookingsClient transforms it, but then hooks.ts');
    console.log('accesses the raw response data and ignores the transformation!');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApiClientTransform();