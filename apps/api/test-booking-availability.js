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

async function testAvailability(token) {
  console.log('\n🔄 Testing Booking Availability Endpoint...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Get today and tomorrow dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Test availability check
  console.log('📅 Checking availability for Emma Williams (Swedish Massage)...');
  console.log(`   Date range: ${today.toLocaleDateString()} - ${tomorrow.toLocaleDateString()}`);
  
  try {
    const response = await axios.get(`${V2_BASE_URL}/bookings/availability`, {
      headers,
      params: {
        staffId: '30f897a4-9faf-4980-a356-d79c59502b18', // Emma Williams
        serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88', // Swedish Massage
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        timezone: 'Australia/Sydney',
      },
    });

    console.log(`\n✅ Found ${response.data.availableSlots.length} available slots`);
    
    // Show first 5 available slots
    console.log('\nFirst 5 available slots:');
    response.data.availableSlots.slice(0, 5).forEach(slot => {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      console.log(`   ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);
    });

    // Show slot statistics
    const totalSlots = response.data.allSlots.length;
    const availableSlots = response.data.availableSlots.length;
    const bookedSlots = totalSlots - availableSlots;
    
    console.log(`\n📊 Slot Statistics:`);
    console.log(`   Total slots: ${totalSlots}`);
    console.log(`   Available: ${availableSlots}`);
    console.log(`   Booked: ${bookedSlots}`);
    console.log(`   Availability rate: ${((availableSlots / totalSlots) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Failed to check availability:', error.response?.data?.message || error.message);
  }
}

async function testAvailabilityWithConflicts(token) {
  console.log('\n🔄 Testing Availability with Existing Bookings...\n');
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // First, create a booking for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0); // 2 PM

  console.log('1️⃣ Creating a booking for tomorrow at 2 PM...');
  try {
    const bookingData = {
      customerId: '7acc76ca-692c-4a59-a8b1-225072278938', // Jane Smith
      staffId: '30f897a4-9faf-4980-a356-d79c59502b18', // Emma Williams
      serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88', // Swedish Massage (60 min)
      locationId: 'dd4dea1e-03fa-4f5e-bf1f-b9863169e550', // Hamilton Main
      startTime: tomorrow.toISOString(),
      notes: 'Test booking for availability check',
    };

    const response = await axios.post(`${V2_BASE_URL}/bookings`, bookingData, { headers });
    console.log(`✅ Booking created: ${response.data.bookingNumber}`);
    console.log(`   Time: ${new Date(response.data.startTime).toLocaleTimeString()} - ${new Date(response.data.endTime).toLocaleTimeString()}`);
  } catch (error) {
    console.error('❌ Failed to create booking:', error.response?.data?.message);
  }

  // Now check availability for the same day
  console.log('\n2️⃣ Checking availability for the same day...');
  
  const startOfDay = new Date(tomorrow);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(tomorrow);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const response = await axios.get(`${V2_BASE_URL}/bookings/availability`, {
      headers,
      params: {
        staffId: '30f897a4-9faf-4980-a356-d79c59502b18', // Emma Williams
        serviceId: '390c26e1-c18f-4692-80b0-fa70db6f1f88', // Swedish Massage
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        timezone: 'Australia/Sydney',
      },
    });

    // Check if the 2 PM slot is marked as unavailable
    const twopmSlot = response.data.allSlots.find(slot => {
      const slotTime = new Date(slot.startTime);
      return slotTime.getHours() === 14 && slotTime.getMinutes() === 0;
    });

    if (twopmSlot) {
      console.log(`\n✅ 2 PM slot status: ${twopmSlot.available ? 'Available' : 'Booked'}`);
      if (!twopmSlot.available) {
        console.log(`   Conflict reason: ${twopmSlot.conflictReason}`);
      }
    }

    // Show slots around the booked time
    console.log('\nSlots around the booked time:');
    response.data.allSlots
      .filter(slot => {
        const slotHour = new Date(slot.startTime).getHours();
        return slotHour >= 13 && slotHour <= 15;
      })
      .forEach(slot => {
        const start = new Date(slot.startTime);
        console.log(`   ${start.toLocaleTimeString()}: ${slot.available ? '✅ Available' : '❌ Booked'}`);
      });

  } catch (error) {
    console.error('❌ Failed to check availability:', error.response?.data?.message || error.message);
  }
}

async function main() {
  console.log('🚀 Testing Booking Availability\n');

  try {
    // Login
    console.log('🔐 Authenticating...');
    const authData = await login();
    const token = authData.token;
    console.log('✅ Authentication successful');

    // Test basic availability
    await testAvailability(token);

    // Test availability with conflicts
    await testAvailabilityWithConflicts(token);

    console.log('\n✅ All availability tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main().catch(console.error);