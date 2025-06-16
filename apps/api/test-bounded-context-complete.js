const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';
const V2_BASE_URL = 'http://localhost:3000/api/v2';

async function login() {
  const response = await axios.post(`${API_BASE_URL}/auth/merchant/login`, {
    username: 'HAMILTON',
    password: 'demo123',
  });
  return response.data;
}

async function testBoundedContext(token) {
  console.log('🧪 Comprehensive Bounded Context Test\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Create booking
  totalTests++;
  console.log('1️⃣ Testing V2 booking creation...');
  try {
    const bookingData = {
      customerId: '7acc76ca-692c-4a59-a8b1-225072278938',
      staffId: '30f897a4-9faf-4980-a356-d79c59502b18',
      serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88',
      locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550',
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      notes: 'Test V2 booking',
    };
    const response = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    console.log(`✅ Created booking: ${response.data.bookingNumber}`);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 2: Query bookings
  totalTests++;
  console.log('\n2️⃣ Testing V2 booking queries...');
  try {
    const response = await axios.get(`${V2_BASE_URL}/bookings`, { headers });
    console.log(`✅ Found ${response.data.meta.total} bookings`);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 3: Get single booking
  totalTests++;
  console.log('\n3️⃣ Testing V2 get single booking...');
  try {
    const bookings = await axios.get(`${V2_BASE_URL}/bookings`, { headers });
    if (bookings.data.data.length > 0) {
      const bookingId = bookings.data.data[0].id;
      const response = await axios.get(`${V2_BASE_URL}/bookings/${bookingId}`, { headers });
      console.log(`✅ Retrieved booking: ${response.data.bookingNumber}`);
      passedTests++;
    } else {
      console.log('⚠️ No bookings to test with');
    }
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 4: Update booking
  totalTests++;
  console.log('\n4️⃣ Testing V2 booking update...');
  try {
    const bookings = await axios.get(`${V2_BASE_URL}/bookings?status=CONFIRMED`, { headers });
    if (bookings.data.data.length > 0) {
      const bookingId = bookings.data.data[0].id;
      const response = await axios.patch(
        `${V2_BASE_URL}/bookings/${bookingId}`,
        { notes: 'Updated via V2 API' },
        { headers }
      );
      console.log(`✅ Updated booking: ${response.data.bookingNumber}`);
      passedTests++;
    } else {
      console.log('⚠️ No confirmed bookings to update');
    }
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 5: Check availability
  totalTests++;
  console.log('\n5️⃣ Testing V2 availability check...');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const response = await axios.get(`${V2_BASE_URL}/bookings/availability`, {
      headers,
      params: {
        staffId: '30f897a4-9faf-4980-a356-d79c59502b18',
        serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88',
        startDate: new Date().toISOString(),
        endDate: tomorrow.toISOString(),
      },
    });
    console.log(`✅ Found ${response.data.availableSlots.length} available slots`);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 6: Booking lifecycle
  totalTests++;
  console.log('\n6️⃣ Testing V2 booking lifecycle...');
  try {
    // Create a booking
    const bookingData = {
      customerId: '7acc76ca-692c-4a59-a8b1-225072278938',
      staffId: '8f103b47-9199-46a9-a1ce-1d32967ab480', // Different staff
      serviceId: '784061d2-bd4c-46eb-9448-f27303bbf95b', // Classic Facial
      locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550',
      startTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      notes: 'Test lifecycle',
    };
    const createResponse = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    const bookingId = createResponse.data.id;
    
    // Start it
    await axios.patch(`${V2_BASE_URL}/bookings/${bookingId}/start`, {}, { headers });
    
    // Complete it
    await axios.patch(`${V2_BASE_URL}/bookings/${bookingId}/complete`, {}, { headers });
    
    console.log(`✅ Lifecycle complete: ${createResponse.data.bookingNumber}`);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 7: Cancel booking
  totalTests++;
  console.log('\n7️⃣ Testing V2 booking cancellation...');
  try {
    // Create a booking to cancel
    const bookingData = {
      customerId: 'c6a89d28-c0a5-4b70-8421-32e1efa0138e',
      staffId: '647c1512-1023-4534-b0c1-6564c444a590',
      serviceId: '291cdafc-86ea-4ae1-89ba-7a23fb066408',
      locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550',
      startTime: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
      notes: 'Test cancellation',
    };
    const createResponse = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    const bookingId = createResponse.data.id;
    
    // Cancel it
    await axios.patch(
      `${V2_BASE_URL}/bookings/${bookingId}/cancel`,
      { reason: 'Customer requested' },
      { headers }
    );
    
    console.log(`✅ Cancelled booking: ${createResponse.data.bookingNumber}`);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 8: Public API integration
  totalTests++;
  console.log('\n8️⃣ Testing public API availability...');
  try {
    const response = await axios.get('http://localhost:3000/api/v1/public/availability', {
      params: {
        staffId: '30f897a4-9faf-4980-a356-d79c59502b18',
        serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    console.log(`✅ Public API found ${response.data.availableSlots.length} slots`);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  // Test 9: Concurrent booking prevention
  totalTests++;
  console.log('\n9️⃣ Testing concurrent booking prevention...');
  try {
    const conflictTime = new Date(Date.now() + 120 * 60 * 60 * 1000);
    const bookingData = {
      customerId: '7acc76ca-692c-4a59-a8b1-225072278938',
      staffId: '30f897a4-9faf-4980-a356-d79c59502b18',
      serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88',
      locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550',
      startTime: conflictTime.toISOString(),
      notes: 'First booking',
    };
    
    // Create first booking
    await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    
    // Try to create conflicting booking
    try {
      await axios.post(`${V2_BASE_URL}/bookings`, {
        ...bookingData,
        notes: 'Conflicting booking',
      }, { headers });
      console.error('❌ Failed: Double booking was allowed!');
    } catch (error) {
      if (error.response?.data?.message?.includes('conflicts')) {
        console.log('✅ Correctly prevented double booking');
        passedTests++;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('✅ All tests passed! Bounded context is fully functional.');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} tests failed.`);
  }
}

async function main() {
  console.log('🚀 Testing Bounded Context Implementation\n');

  try {
    // Login
    console.log('🔐 Authenticating...');
    const authData = await login();
    const token = authData.token;
    console.log('✅ Authentication successful\n');

    // Run comprehensive tests
    await testBoundedContext(token);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main().catch(console.error);