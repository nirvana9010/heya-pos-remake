const axios = require('axios');

async function checkBookingPersistence() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    // Get the booking
    const bookingId = '82bee171-9b08-4867-82e2-ec5ab69c1580';
    
    console.log('Checking booking status persistence...\n');
    
    // Check status multiple times
    for (let i = 0; i < 5; i++) {
      const response = await axios.get(`http://localhost:3000/api/v2/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Merchant-Subdomain': 'hamilton'
        }
      });
      
      console.log(`Check ${i + 1}:`);
      console.log(`  Status: ${response.data.status}`);
      console.log(`  Payment Status: ${response.data.paymentStatus}`);
      console.log(`  Updated At: ${response.data.updatedAt}`);
      
      if (i < 4) {
        console.log('  Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Now check via list endpoint
    console.log('\nChecking via list endpoint:');
    const listResponse = await axios.get('http://localhost:3000/api/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      },
      params: {
        startDate: '2025-06-30',
        endDate: '2025-06-30'
      }
    });
    
    const booking = listResponse.data.data.find(b => b.id === bookingId);
    console.log(`  Status: ${booking?.status}`);
    console.log(`  Payment Status: ${booking?.paymentStatus}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkBookingPersistence();