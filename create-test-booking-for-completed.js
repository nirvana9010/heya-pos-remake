const axios = require('axios');

async function createTestBooking() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Merchant-Subdomain': 'hamilton'
    };
    
    console.log('📋 Creating new test booking...\n');
    
    // Get required data
    const [customersRes, servicesRes, staffRes, locationsRes] = await Promise.all([
      axios.get('http://localhost:3000/api/v1/customers?limit=1', { headers }),
      axios.get('http://localhost:3000/api/v1/services?limit=1', { headers }),
      axios.get('http://localhost:3000/api/v1/staff?limit=1', { headers }),
      axios.get('http://localhost:3000/api/v1/locations', { headers })
    ]);
    
    const customer = customersRes.data.data[0];
    const service = servicesRes.data[0];
    const staff = staffRes.data[0];
    const location = locationsRes.data[0];
    
    // Create booking in the future
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    
    const bookingData = {
      customerId: customer.id,
      locationId: location.id,
      services: [{
        serviceId: service.id,
        staffId: staff.id
      }],
      startTime: startTime.toISOString(),
      notes: 'Test booking for completed status'
    };
    
    console.log('Creating booking...');
    const createResponse = await axios.post(
      'http://localhost:3000/api/v2/bookings',
      bookingData,
      { headers }
    );
    
    const booking = createResponse.data;
    console.log('✓ Booking created:', booking.id);
    console.log('  Status:', booking.status);
    console.log('  completedAt:', booking.completedAt || 'null');
    
    // Now complete it
    console.log('\n🎯 Testing completion flow...\n');
    
    // Start
    console.log('1. Starting booking...');
    const startResponse = await axios.patch(
      `http://localhost:3000/api/v2/bookings/${booking.id}/start`,
      {},
      { headers }
    );
    console.log('  ✓ Started');
    console.log('  Status:', startResponse.data.status);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete
    console.log('\n2. Completing booking...');
    const completeResponse = await axios.patch(
      `http://localhost:3000/api/v2/bookings/${booking.id}/complete`,
      {},
      { headers }
    );
    console.log('  ✓ Completed');
    console.log('  Status:', completeResponse.data.status);
    console.log('  completedAt:', completeResponse.data.completedAt || 'null');
    
    // Verify persistence
    console.log('\n3. Verifying persistence...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verifyResponse = await axios.get(
      `http://localhost:3000/api/v2/bookings/${booking.id}`,
      { headers }
    );
    
    console.log('  Status:', verifyResponse.data.status);
    console.log('  completedAt:', verifyResponse.data.completedAt || 'null');
    
    console.log('\n📊 RESULT:');
    if (verifyResponse.data.completedAt) {
      console.log('✅ SUCCESS! completedAt is being populated!');
      console.log('✅ The completed checkmark will now persist!');
    } else {
      console.log('❌ FAILED! completedAt is still null');
      console.log('Need to check if backend changes were applied correctly');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

createTestBooking();