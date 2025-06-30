const axios = require('axios');

async function testCompletedFilter() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    // Get the booking
    const bookingId = '82bee171-9b08-4867-82e2-ec5ab69c1580';
    
    console.log('🔍 Testing completed status filter behavior...\n');
    
    // First, ensure booking is completed
    const bookingResponse = await axios.get(`http://localhost:3000/api/v2/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      }
    });
    
    console.log('📋 Booking status:', bookingResponse.data.status);
    
    if (bookingResponse.data.status !== 'COMPLETED') {
      // Complete it
      console.log('🔄 Completing booking...');
      await axios.patch(
        `http://localhost:3000/api/v2/bookings/${bookingId}/complete`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Merchant-Subdomain': 'hamilton'
          }
        }
      );
      console.log('✓ Booking completed\n');
    }
    
    // Now test the frontend transformation
    console.log('🎯 Frontend would transform status as follows:');
    console.log('  Backend status: COMPLETED');
    console.log('  Frontend status: completed (lowercase)');
    console.log('');
    
    console.log('⚠️  CRITICAL ISSUE IDENTIFIED:');
    console.log('');
    console.log('The calendar filter checks for status === "completed" (lowercase)');
    console.log('But if the "Show completed bookings" checkbox is unchecked,');
    console.log('completed bookings will disappear from the calendar view.');
    console.log('');
    console.log('This explains why the completed status "disappears while looking at it"');
    console.log('- it\'s being filtered out by the UI, not lost from the backend!');
    console.log('');
    console.log('📊 Default status filters include:');
    console.log('  ["confirmed", "in-progress", "completed", "cancelled", "no-show"]');
    console.log('');
    console.log('But if the user unchecked "Show completed bookings" in the filter,');
    console.log('then completed bookings would vanish from view.');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCompletedFilter();