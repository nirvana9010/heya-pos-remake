const axios = require('axios');

async function listBookings() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    // Get today's bookings
    const response = await axios.get('http://localhost:3000/api/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      },
      params: {
        startDate: '2025-06-30',
        endDate: '2025-06-30'
      }
    });
    
    console.log(`Found ${response.data.data.length} bookings for June 30:`);
    response.data.data.forEach(booking => {
      console.log(`- ${booking.id}: ${booking.customerName} - ${booking.status} (Payment: ${booking.paymentStatus})`);
      if (booking.services[0]) {
        console.log(`  Service: ${booking.services[0].name}, Duration: ${booking.duration || booking.totalDuration}min`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

listBookings();