const axios = require('axios');

async function debugBookingCreation() {
  try {
    // First, login as merchant to check directly in database
    console.log('1. Logging in as merchant...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    const token = loginRes.data.accessToken;
    
    // Get services
    const servicesRes = await axios.get('http://localhost:3000/api/public/services');
    const serviceId = servicesRes.data.data[0].id;
    
    // Create booking through public API
    console.log('\n2. Creating booking through public API...');
    const bookingData = {
      customerName: 'Debug Test Customer',
      customerEmail: 'debug@test.com',
      customerPhone: '0412345678',
      serviceId: serviceId,
      date: '2025-06-13',
      startTime: '15:00',
      notes: 'Debug booking number test'
    };
    
    const createRes = await axios.post('http://localhost:3000/api/public/bookings', bookingData);
    const createdBooking = createRes.data;
    console.log('Public API Response:');
    console.log('- ID:', createdBooking.id);
    console.log('- Booking Number:', createdBooking.bookingNumber);
    
    // Now fetch the same booking through merchant API
    console.log('\n3. Fetching booking through merchant API...');
    const merchantBookingRes = await axios.get(
      `http://localhost:3000/api/bookings/${createdBooking.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const merchantBooking = merchantBookingRes.data;
    console.log('Merchant API Response:');
    console.log('- ID:', merchantBooking.id);
    console.log('- Booking Number:', merchantBooking.bookingNumber);
    
    // Check if they match
    console.log('\n4. Comparison:');
    console.log('Public API booking number:', createdBooking.bookingNumber);
    console.log('Merchant API booking number:', merchantBooking.bookingNumber);
    console.log('Match?', createdBooking.bookingNumber === merchantBooking.bookingNumber);
    
    // Also check the bookings list to see the format there
    console.log('\n5. Checking bookings list...');
    const bookingsListRes = await axios.get(
      'http://localhost:3000/api/bookings',
      { 
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5 }
      }
    );
    
    const recentBookings = bookingsListRes.data.data;
    console.log('Recent booking numbers:');
    recentBookings.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.bookingNumber} (${b.customerName || b.customer?.firstName})`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugBookingCreation();