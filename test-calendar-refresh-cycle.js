const axios = require('axios');

async function testCalendarRefreshCycle() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    const bookingId = '82bee171-9b08-4867-82e2-ec5ab69c1580';
    
    console.log('🔍 Testing calendar data refresh cycle...\n');
    
    // Simulate what happens during a calendar refresh
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Refresh cycle ${i + 1} ---`);
      
      // 1. Get booking directly
      const directResponse = await axios.get(`http://localhost:3000/api/v2/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Merchant-Subdomain': 'hamilton'
        }
      });
      
      console.log(`Direct API call - Status: ${directResponse.data.status}`);
      
      // 2. Get via list endpoint (what calendar uses)
      const listResponse = await axios.get('http://localhost:3000/api/v2/bookings', {
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
      
      const bookingInList = listResponse.data.data.find(b => b.id === bookingId);
      console.log(`List API call - Status: ${bookingInList?.status || 'NOT FOUND'}`);
      console.log(`List API call - Full booking:`, JSON.stringify(bookingInList, null, 2));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCalendarRefreshCycle();