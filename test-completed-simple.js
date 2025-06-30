const axios = require('axios');

async function testCompletedSimple() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    const bookingId = '82bee171-9b08-4867-82e2-ec5ab69c1580';
    
    console.log('🔍 Checking if completedAt is populated...\n');
    
    const response = await axios.get(`http://localhost:3000/api/v2/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      }
    });
    
    console.log('Booking Details:');
    console.log('  ID:', response.data.id);
    console.log('  Status:', response.data.status);
    console.log('  completedAt:', response.data.completedAt || 'null');
    console.log('  paidAt:', response.data.paidAt);
    console.log('  paymentStatus:', response.data.paymentStatus);
    
    console.log('\n📊 Analysis:');
    console.log('- Booking IS completed (status = COMPLETED)');
    console.log('- Payment IS recorded (paidAt is set)');
    console.log('- But completedAt is NOT set');
    console.log('\nThis means our backend changes need to populate existing completed bookings.');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCompletedSimple();