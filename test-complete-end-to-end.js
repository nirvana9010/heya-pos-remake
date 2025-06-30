const axios = require('axios');

async function testCompleteEndToEnd() {
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
    
    console.log('🚀 Complete End-to-End Test for Completed Status Persistence\n');
    
    // Get required data
    const [customersRes, servicesRes, staffRes, locationsRes] = await Promise.all([
      axios.get('http://localhost:3000/api/v1/customers?limit=1', { headers }),
      axios.get('http://localhost:3000/api/v1/services?limit=1', { headers }),
      axios.get('http://localhost:3000/api/v1/staff', { headers }),
      axios.get('http://localhost:3000/api/v1/locations', { headers })
    ]);
    
    const customer = customersRes.data.data[0];
    const service = servicesRes.data.data[0];
    const staff = Array.isArray(staffRes.data) ? staffRes.data[2] : staffRes.data; // Try third staff
    const location = Array.isArray(locationsRes.data) ? locationsRes.data[0] : locationsRes.data;
    
    // Create booking 3 hours from now
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 3);
    startTime.setMinutes(0, 0, 0);
    
    const bookingData = {
      customerId: customer.id,
      locationId: location.id,
      services: [{
        serviceId: service.id,
        staffId: staff.id
      }],
      startTime: startTime.toISOString(),
      notes: 'E2E test for completed persistence'
    };
    
    console.log('1️⃣  Creating booking...');
    const createResponse = await axios.post(
      'http://localhost:3000/api/v2/bookings',
      bookingData,
      { headers }
    );
    
    const booking = createResponse.data;
    console.log('   ✓ Created:', booking.id);
    console.log('   Time:', new Date(booking.startTime).toLocaleString());
    
    // Start and complete
    console.log('\n2️⃣  Starting booking...');
    await axios.patch(`http://localhost:3000/api/v2/bookings/${booking.id}/start`, {}, { headers });
    console.log('   ✓ Started');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('\n3️⃣  Completing booking...');
    const completeRes = await axios.patch(
      `http://localhost:3000/api/v2/bookings/${booking.id}/complete`,
      {},
      { headers }
    );
    console.log('   ✓ Completed');
    console.log('   completedAt:', completeRes.data.completedAt);
    
    // Check calendar view
    console.log('\n4️⃣  Checking calendar view...');
    const bookingDate = new Date(booking.startTime).toISOString().split('T')[0];
    
    const calendarRes = await axios.get(
      `http://localhost:3000/api/v2/bookings/calendar?startDate=${bookingDate}&endDate=${bookingDate}`,
      { headers }
    );
    
    const slots = calendarRes.data.slots || [];
    const ourSlot = slots.find(slot => slot.bookingId === booking.id);
    
    if (ourSlot) {
      console.log('   ✓ Found in calendar!');
      console.log('   Status:', ourSlot.status);
      console.log('   completedAt:', ourSlot.completedAt);
      
      if (ourSlot.completedAt) {
        console.log('\n✅ SUCCESS! Complete status will persist!');
        console.log('   The green checkmark will stay visible.');
      } else {
        console.log('\n⚠️  WARNING: completedAt not in calendar response');
      }
    } else {
      console.log('   ❌ Not found in calendar');
    }
    
    // Also verify direct booking fetch
    console.log('\n5️⃣  Verifying direct fetch...');
    const directRes = await axios.get(
      `http://localhost:3000/api/v2/bookings/${booking.id}`,
      { headers }
    );
    
    console.log('   Status:', directRes.data.status);
    console.log('   completedAt:', directRes.data.completedAt);
    
    console.log('\n📊 FINAL RESULT:');
    if (directRes.data.completedAt && ourSlot?.completedAt) {
      console.log('✅ FULL SUCCESS! Completed status persists everywhere!');
      console.log('✅ The UI will show persistent green checkmarks!');
    } else if (directRes.data.completedAt) {
      console.log('⚠️  PARTIAL: completedAt exists but not in calendar');
    } else {
      console.log('❌ FAILED: completedAt not being set');
    }
    
  } catch (error) {
    console.error('\nError:', error.response?.data || error.message);
  }
}

testCompleteEndToEnd();