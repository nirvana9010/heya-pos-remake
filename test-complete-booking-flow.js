const axios = require('axios');

async function testCompleteFlow() {
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
    
    console.log('📋 Getting required data...\n');
    
    // Get customers - check response structure
    const customersRes = await axios.get('http://localhost:3000/api/v1/customers?limit=1', { headers });
    console.log('Customers response structure:', Object.keys(customersRes.data));
    const customers = customersRes.data.data || customersRes.data;
    const customer = Array.isArray(customers) ? customers[0] : customers;
    
    if (!customer) {
      console.error('No customer found');
      return;
    }
    
    // Get services
    const servicesRes = await axios.get('http://localhost:3000/api/v1/services?limit=1', { headers });
    console.log('Services response structure:', Object.keys(servicesRes.data));
    const services = servicesRes.data.data || servicesRes.data;
    const service = Array.isArray(services) ? services[0] : services;
    
    // Get staff - try to get a different one
    const staffRes = await axios.get('http://localhost:3000/api/v1/staff', { headers });
    console.log('Staff response structure:', Object.keys(staffRes.data));
    const staffList = staffRes.data.data || staffRes.data;
    // Try to get the second staff member if available
    const staff = Array.isArray(staffList) ? (staffList[1] || staffList[0]) : staffList;
    
    // Get locations
    const locationsRes = await axios.get('http://localhost:3000/api/v1/locations', { headers });
    console.log('Locations response structure:', Object.keys(locationsRes.data));
    const locations = locationsRes.data.data || locationsRes.data;
    const location = Array.isArray(locations) ? locations[0] : locations;
    
    console.log('\nData gathered:');
    console.log('- Customer:', customer?.id);
    console.log('- Service:', service?.id);
    console.log('- Staff:', staff?.id);
    console.log('- Location:', location?.id);
    
    if (!customer?.id || !service?.id || !staff?.id || !location?.id) {
      console.error('Missing required data');
      return;
    }
    
    // Create booking tomorrow at 2pm to avoid conflicts
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(14, 0, 0, 0);
    
    const bookingData = {
      customerId: customer.id,
      locationId: location.id,
      services: [{
        serviceId: service.id,
        staffId: staff.id
      }],
      startTime: startTime.toISOString(),
      notes: 'Test booking for completedAt field'
    };
    
    console.log('\n🎯 Creating booking...');
    const createResponse = await axios.post(
      'http://localhost:3000/api/v2/bookings',
      bookingData,
      { headers }
    );
    
    const booking = createResponse.data;
    console.log('✓ Booking created:', booking.id);
    console.log('  Status:', booking.status);
    console.log('  completedAt:', booking.completedAt || 'null');
    
    // Start the booking
    console.log('\n1. Starting booking...');
    const startResponse = await axios.patch(
      `http://localhost:3000/api/v2/bookings/${booking.id}/start`,
      {},
      { headers }
    );
    console.log('  ✓ Started');
    console.log('  Status:', startResponse.data.status);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete the booking
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
    
    console.log('\n📊 FINAL RESULT:');
    if (verifyResponse.data.completedAt) {
      console.log('✅ SUCCESS! completedAt is now populated!');
      console.log('✅ The completed checkmark should persist in the UI!');
      console.log('✅ Timestamp:', new Date(verifyResponse.data.completedAt).toLocaleString());
    } else {
      console.log('❌ FAILED! completedAt is still null');
      console.log('❌ Need to verify backend implementation');
    }
    
  } catch (error) {
    console.error('\nError:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('Server error - check API logs');
    }
  }
}

testCompleteFlow();