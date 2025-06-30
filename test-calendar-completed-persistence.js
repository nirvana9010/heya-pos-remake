const axios = require('axios');

async function testCalendarPersistence() {
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
    
    console.log('📅 Testing calendar view completed persistence...\n');
    
    // Get tomorrow's date for our test booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = startDate;
    
    // Get calendar view
    const calendarResponse = await axios.get(
      `http://localhost:3000/api/v2/bookings/calendar?startDate=${startDate}&endDate=${endDate}`,
      { headers }
    );
    
    console.log('Calendar slots found:', calendarResponse.data.length);
    
    // Find our completed booking
    const completedBooking = calendarResponse.data.find(slot => 
      slot.booking && slot.booking.completedAt
    );
    
    if (completedBooking) {
      console.log('\n✅ COMPLETED BOOKING FOUND IN CALENDAR:');
      console.log('- Booking ID:', completedBooking.booking.id);
      console.log('- Status:', completedBooking.booking.status);
      console.log('- completedAt:', completedBooking.booking.completedAt);
      console.log('- Customer:', completedBooking.booking.customerName);
      console.log('\n🎯 The UI should now show a persistent green checkmark!');
    } else {
      console.log('\n❌ No completed bookings found with completedAt field');
    }
    
    // Also check the specific booking we just created
    console.log('\n📋 Checking our test booking directly...');
    const bookingId = 'c87af90a-c09e-4682-9fc2-9625227db988';
    
    try {
      const bookingResponse = await axios.get(
        `http://localhost:3000/api/v2/bookings/${bookingId}`,
        { headers }
      );
      
      console.log('Direct booking check:');
      console.log('- Status:', bookingResponse.data.status);
      console.log('- completedAt:', bookingResponse.data.completedAt);
      
    } catch (e) {
      console.log('Could not find test booking');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCalendarPersistence();