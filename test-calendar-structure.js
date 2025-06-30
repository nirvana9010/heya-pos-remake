const axios = require('axios');

async function testCalendarStructure() {
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
    
    console.log('📅 Checking calendar response structure...\n');
    
    // Get today's date
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = startDate;
    
    // Get calendar view
    const calendarResponse = await axios.get(
      `http://localhost:3000/api/v2/bookings/calendar?startDate=${startDate}&endDate=${endDate}`,
      { headers }
    );
    
    console.log('Response type:', typeof calendarResponse.data);
    console.log('Response keys:', Object.keys(calendarResponse.data));
    
    if (calendarResponse.data.slots) {
      console.log('\nSlots array found, checking structure...');
      console.log('Number of slots:', calendarResponse.data.slots.length);
      
      // Find any booking with completedAt
      const slotsWithBookings = calendarResponse.data.slots.filter(slot => slot.booking);
      console.log('Slots with bookings:', slotsWithBookings.length);
      
      if (slotsWithBookings.length > 0) {
        console.log('\nFirst booking found:');
        const firstBooking = slotsWithBookings[0].booking;
        console.log('- ID:', firstBooking.id);
        console.log('- Status:', firstBooking.status);
        console.log('- completedAt:', firstBooking.completedAt || 'null');
        console.log('- Has completedAt?', !!firstBooking.completedAt);
      }
      
      // Look specifically for completed bookings
      const completedSlots = calendarResponse.data.slots.filter(slot => 
        slot.booking && (slot.booking.status === 'COMPLETED' || slot.booking.completedAt)
      );
      
      console.log('\nCompleted bookings found:', completedSlots.length);
      if (completedSlots.length > 0) {
        console.log('First completed booking:');
        const completed = completedSlots[0].booking;
        console.log('- ID:', completed.id);
        console.log('- completedAt:', completed.completedAt);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCalendarStructure();