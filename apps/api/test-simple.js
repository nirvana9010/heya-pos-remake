const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function login() {
  console.log('🔐 Logging in...');
  const response = await axios.post(`${API_BASE_URL}/auth/merchant/login`, {
    username: 'HAMILTON',
    password: 'demo123',
  });
  console.log('Auth response user:', response.data.user);
  return response.data;
}


async function testV2BookingCreation(token) {
  console.log('\n📝 Testing V2 Booking Creation...');
  
  try {
    const bookingData = {
      customerId: 'ed4b926a-f94c-444b-a6f6-8b5d56d4a5d4', // Jane Smith
      staffId: '9f3f78cf-ce89-4842-8682-fc9e7709c808', // Emma Williams
      serviceId: '0b61dd85-e962-42fe-aa72-fb314e61cde6', // Swedish Massage
      locationId: 'dfbca25a-bdba-42c1-9247-6b9fb7ffb9b4', // Hamilton Main
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      notes: 'Test booking via V2 API with transactional script pattern',
    };

    const response = await axios.post(
      'http://localhost:3000/api/v2/bookings',
      bookingData,
      { 
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('✅ V2 Booking created successfully:', {
      id: response.data.id || 'N/A',
      bookingNumber: response.data.bookingNumber || 'N/A',
      status: response.data.status || 'N/A',
    });

    return response.data;
  } catch (error) {
    console.error('❌ V2 Booking creation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Testing Bounded Context Implementation\n');

  try {
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const authData = await login();
    const token = authData.token;
    console.log('✅ Authentication successful\n');

    await testV2BookingCreation(token);

    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);