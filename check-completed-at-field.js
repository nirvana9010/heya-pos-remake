const axios = require('axios');

async function checkCompletedAtField() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    // Get a specific booking
    const bookingId = '82bee171-9b08-4867-82e2-ec5ab69c1580';
    
    const response = await axios.get(`http://localhost:3000/api/v2/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      }
    });
    
    console.log('📊 Booking Fields Related to Completion:\n');
    console.log('status:', response.data.status);
    console.log('completedAt:', response.data.completedAt);
    console.log('paidAt:', response.data.paidAt);
    console.log('paymentStatus:', response.data.paymentStatus);
    
    console.log('\n✅ SOLUTION:');
    console.log('The database ALREADY has a completedAt field!');
    console.log('Just like we show PAID badge when paidAt !== null,');
    console.log('we can show COMPLETED indicator when completedAt !== null');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkCompletedAtField();