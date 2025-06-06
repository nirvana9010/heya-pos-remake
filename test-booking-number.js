const axios = require('axios');

async function testBookingNumber() {
  try {
    // Get services first
    const servicesRes = await axios.get('http://localhost:3000/api/public/services');
    const serviceId = servicesRes.data.data[0].id;
    
    // Create booking
    const bookingData = {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '0412345678',
      serviceId: serviceId,
      date: '2025-06-13',
      startTime: '14:00',
      notes: 'Testing booking number'
    };
    
    const createRes = await axios.post('http://localhost:3000/api/public/bookings', bookingData);
    console.log('Created booking response:', JSON.stringify(createRes.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBookingNumber();