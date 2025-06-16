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

async function testConcurrentBookingPrevention(token) {
  console.log('\n🔄 Testing Concurrent Booking Prevention...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Same booking data for both requests
  const bookingData = {
    customerId: 'ed4b926a-f94c-444b-a6f6-8b5d56d4a5d4', // Jane Smith
    staffId: '9f3f78cf-ce89-4842-8682-fc9e7709c808', // Emma Williams
    serviceId: '0b61dd85-e962-42fe-aa72-fb314e61cde6', // Swedish Massage (60 min)
    locationId: 'dfbca25a-bdba-42c1-9247-6b9fb7ffb9b4', // Hamilton Main
    startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    notes: 'Concurrent booking test',
  };

  console.log('📅 Attempting to create two bookings for:');
  console.log(`   Staff: Emma Williams`);
  console.log(`   Time: ${bookingData.startTime}`);
  console.log(`   Service: Swedish Massage (60 minutes)\n`);

  // Create two concurrent booking requests
  const promise1 = axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
  const promise2 = axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });

  const results = await Promise.allSettled([promise1, promise2]);
  
  let successCount = 0;
  let failureCount = 0;
  const successfulBookings = [];
  const failedBookings = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
      successfulBookings.push(result.value.data);
      console.log(`✅ Request ${index + 1} SUCCEEDED:`);
      console.log(`   Booking ID: ${result.value.data.id}`);
      console.log(`   Booking Number: ${result.value.data.bookingNumber}`);
    } else {
      failureCount++;
      failedBookings.push(result.reason.response?.data);
      const error = result.reason.response?.data;
      console.log(`❌ Request ${index + 1} FAILED:`);
      console.log(`   Error: ${error?.message || result.reason.message}`);
      if (error?.conflicts) {
        console.log(`   Conflicts detected:`, error.conflicts);
      }
    }
    console.log('');
  });

  console.log(`📊 Results Summary:`);
  console.log(`   Successful bookings: ${successCount}`);
  console.log(`   Failed bookings: ${failureCount}`);
  
  if (successCount === 1 && failureCount === 1) {
    console.log('\n✅ PASS: Concurrent booking prevention is working correctly!');
    console.log('   Only one booking was created, the other was blocked.\n');
  } else if (successCount === 2) {
    console.error('\n❌ FAIL: Both bookings succeeded - double booking occurred!');
    console.error('   This is a critical issue - the pessimistic locking is not working.\n');
  } else {
    console.error('\n⚠️ UNEXPECTED: Both requests failed');
    console.error('   This might indicate a different issue.\n');
  }

  return { successfulBookings, failedBookings };
}

async function testOverlappingBookings(token) {
  console.log('\n🔄 Testing Overlapping Booking Prevention...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const baseTime = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours from now
  
  // First booking: 5:00 PM - 6:00 PM
  const booking1 = {
    customerId: 'ed4b926a-f94c-444b-a6f6-8b5d56d4a5d4',
    staffId: '9f3f78cf-ce89-4842-8682-fc9e7709c808',
    serviceId: '0b61dd85-e962-42fe-aa72-fb314e61cde6', // 60 min service
    locationId: 'dfbca25a-bdba-42c1-9247-6b9fb7ffb9b4',
    startTime: baseTime.toISOString(),
    notes: 'First booking',
  };

  console.log('📅 Creating first booking...');
  try {
    const response1 = await axios.post(`${V2_BASE_URL}/bookings`, booking1, { headers });
    console.log(`✅ First booking created: ${response1.data.bookingNumber}`);
    console.log(`   Time: ${baseTime.toLocaleTimeString()} - ${new Date(baseTime.getTime() + 60 * 60 * 1000).toLocaleTimeString()}\n`);
  } catch (error) {
    console.error('❌ Failed to create first booking:', error.response?.data?.message);
    return;
  }

  // Test various overlapping scenarios
  const testCases = [
    {
      name: 'Complete overlap (same time)',
      startTime: baseTime,
      duration: 60,
      shouldFail: true,
    },
    {
      name: 'Partial overlap (starts 30 min into first booking)',
      startTime: new Date(baseTime.getTime() + 30 * 60 * 1000),
      duration: 60,
      shouldFail: true,
    },
    {
      name: 'Partial overlap (ends 30 min into first booking)',
      startTime: new Date(baseTime.getTime() - 30 * 60 * 1000),
      duration: 60,
      shouldFail: true,
    },
    {
      name: 'No overlap (starts immediately after)',
      startTime: new Date(baseTime.getTime() + 60 * 60 * 1000),
      duration: 60,
      shouldFail: false,
    },
    {
      name: 'No overlap (ends immediately before)',
      startTime: new Date(baseTime.getTime() - 60 * 60 * 1000),
      duration: 60,
      shouldFail: false,
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    const endTime = new Date(testCase.startTime.getTime() + testCase.duration * 60 * 1000);
    console.log(`   Time: ${testCase.startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);

    const booking = {
      ...booking1,
      startTime: testCase.startTime.toISOString(),
      notes: testCase.name,
    };

    try {
      const response = await axios.post(`${V2_BASE_URL}/bookings`, booking, { headers });
      if (testCase.shouldFail) {
        console.error(`   ❌ FAIL: Booking succeeded but should have been blocked!`);
        console.error(`      Booking Number: ${response.data.bookingNumber}`);
      } else {
        console.log(`   ✅ PASS: Booking succeeded as expected`);
        console.log(`      Booking Number: ${response.data.bookingNumber}`);
      }
    } catch (error) {
      if (testCase.shouldFail) {
        console.log(`   ✅ PASS: Booking blocked as expected`);
        console.log(`      Error: ${error.response?.data?.message}`);
      } else {
        console.error(`   ❌ FAIL: Booking failed but should have succeeded!`);
        console.error(`      Error: ${error.response?.data?.message}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 Testing Concurrent Booking Prevention with Transactional Script Pattern\n');

  try {
    // Login
    console.log('🔐 Authenticating...');
    const authData = await login();
    const token = authData.token;
    console.log('✅ Authentication successful');

    // Test concurrent bookings
    await testConcurrentBookingPrevention(token);

    // Test overlapping bookings
    await testOverlappingBookings(token);

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main().catch(console.error);