const axios = require('axios');

async function testCalendarState() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
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
    
    console.log('📊 Booking Status Summary:');
    console.log('Total bookings:', bookings.length);
    
    // Count by status
    const statusCounts = {};
    bookings.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    });
    
    console.log('\nStatus breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Find completed bookings
    const completedBookings = bookings.filter(b => 
      b.status === 'COMPLETED' || b.status === 'COMPLETE' || b.status === 'completed'
    );
    
    console.log(`\n✅ Completed bookings: ${completedBookings.length}`);
    if (completedBookings.length > 0) {
      completedBookings.forEach(booking => {
        console.log(`  - ${booking.id}: ${booking.customerName} (${booking.status})`);
      });
    }
    
    // Check the specific booking
    const specificBooking = bookings.find(b => b.id === '82bee171-9b08-4867-82e2-ec5ab69c1580');
    if (specificBooking) {
      console.log('\n🎯 Specific booking status:', specificBooking.status);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCalendarState();