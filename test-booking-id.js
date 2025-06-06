const axios = require('axios');

async function checkBookingId() {
  try {
    // Get services
    const servicesRes = await axios.get('http://localhost:3000/api/public/services');
    const serviceId = servicesRes.data.data[0].id;
    
    // Create booking
    const bookingData = {
      customerName: 'ID Test Customer',
      customerEmail: 'idtest@example.com',
      customerPhone: '0412345678',
      serviceId: serviceId,
      date: '2025-06-13',
      startTime: '16:00',
      notes: 'Testing booking ID'
    };
    
    const createRes = await axios.post('http://localhost:3000/api/public/bookings', bookingData);
    const booking = createRes.data;
    
    console.log('Booking created:');
    console.log('- ID:', booking.id);
    console.log('- ID length:', booking.id.length);
    console.log('- Booking Number:', booking.bookingNumber);
    console.log('- Booking Number length:', booking.bookingNumber.length);
    
    // Extract parts of booking number
    const parts = booking.bookingNumber.split('-');
    console.log('\nBooking number parts:');
    console.log('- Prefix:', parts[0]);
    console.log('- Middle:', parts[1]);
    console.log('- Suffix:', parts[2]);
    
    // Check if the middle part is a timestamp
    const timestamp = parseInt(parts[0].substring(2)); // Remove "BK" prefix
    const date = new Date(timestamp);
    console.log('\nTimestamp analysis:');
    console.log('- Timestamp:', timestamp);
    console.log('- As date:', date.toString());
    console.log('- Is valid date?', !isNaN(date.getTime()));
    
    // Check if it matches the booking ID
    console.log('\nID comparison:');
    console.log('- Booking ID contains number?', booking.id.includes(timestamp.toString()));
    console.log('- Last part of ID:', booking.id.substring(booking.id.length - 10));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkBookingId();