const axios = require('axios');

async function testCompletedAtPersistence() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    console.log('🔍 Testing completedAt field persistence\n');
    
    // Get bookings
    const bookingsResponse = await axios.get('http://localhost:3000/api/v2/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Merchant-Subdomain': 'hamilton'
      },
      params: {
        startDate: '2025-06-30',
        endDate: '2025-06-30'
      }
    });
    
    const bookings = bookingsResponse.data.data;
    let testBooking = bookings.find(b => b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED');
    
    if (!testBooking) {
      // Use existing booking and reset it
      testBooking = bookings[0];
      if (testBooking && testBooking.status === 'COMPLETED') {
        console.log('Resetting booking to CONFIRMED...');
        await axios.patch(
          `http://localhost:3000/api/v2/bookings/${testBooking.id}`,
          { status: 'CONFIRMED' },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Merchant-Subdomain': 'hamilton'
            }
          }
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!testBooking) {
      console.log('No bookings available to test');
      return;
    }
    
    console.log('📋 Test Booking:');
    console.log('  ID:', testBooking.id);
    console.log('  Status:', testBooking.status);
    console.log('  completedAt (before):', testBooking.completedAt || 'null');
    
    // Start if needed
    if (testBooking.status === 'CONFIRMED') {
      console.log('\n1️⃣ Starting booking...');
      await axios.patch(
        `http://localhost:3000/api/v2/bookings/${testBooking.id}/start`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Merchant-Subdomain': 'hamilton'
          }
        }
      );
      console.log('  ✓ Started');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Complete the booking
    console.log('\n2️⃣ Completing booking...');
    const completeResponse = await axios.patch(
      `http://localhost:3000/api/v2/bookings/${testBooking.id}/complete`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Merchant-Subdomain': 'hamilton'
        }
      }
    );
    console.log('  ✓ Completed');
    console.log('  Response completedAt:', completeResponse.data.completedAt);
    
    // Verify it persists
    console.log('\n3️⃣ Verifying persistence...');
    
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkResponse = await axios.get(`http://localhost:3000/api/v2/bookings/${testBooking.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Merchant-Subdomain': 'hamilton'
        }
      });
      
      console.log(`\n  Check ${i + 1}:`);
      console.log(`    Status: ${checkResponse.data.status}`);
      console.log(`    completedAt: ${checkResponse.data.completedAt || 'null'}`);
      console.log(`    Frontend would show checkmark: ${checkResponse.data.completedAt ? 'YES ✓' : 'NO'}`);
    }
    
    console.log('\n📊 SUMMARY:');
    if (completeResponse.data.completedAt) {
      console.log('✅ completedAt is being set when booking is completed!');
      console.log('✅ This will make the checkmark persist like PAID badge does!');
    } else {
      console.log('❌ completedAt is NOT being set - need to debug backend');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCompletedAtPersistence();