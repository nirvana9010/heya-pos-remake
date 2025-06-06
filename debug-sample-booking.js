const axios = require('axios');

async function debugSampleBooking() {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:3000/api/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginRes.data.token;
    console.log('✓ Logged in successfully');
    
    // Get all bookings with includeAll=true
    const bookingsRes = await axios.get('http://localhost:3000/api/bookings?includeAll=true&limit=500', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const bookings = bookingsRes.data.data;
    console.log(`\n✓ Total bookings fetched: ${bookings.length}`);
    
    // Search for SAMPLE NAME booking
    const sampleBookings = bookings.filter(b => {
      const customerName = b.customer ? 
        `${b.customer.firstName} ${b.customer.lastName}`.toUpperCase() : 
        'UNKNOWN';
      return customerName.includes('SAMPLE');
    });
    
    console.log(`\n✓ Found ${sampleBookings.length} bookings for SAMPLE NAME`);
    
    if (sampleBookings.length > 0) {
      sampleBookings.forEach(booking => {
        console.log('\nBooking Details:');
        console.log(`- ID: ${booking.id}`);
        console.log(`- Booking Number: ${booking.bookingNumber}`);
        console.log(`- Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
        console.log(`- Date: ${booking.startTime}`);
        console.log(`- Service: ${booking.services?.[0]?.service?.name || 'Unknown'}`);
        console.log(`- Status: ${booking.status}`);
      });
    }
    
    // Now test the transformed data (as merchant app would see it)
    console.log('\n--- Testing API Client Transformation ---');
    
    // Simulate the transformation that happens in api-client.ts
    const transformed = bookings.map(booking => {
      const firstService = booking.services?.[0]?.service;
      const serviceName = firstService?.name || 'Service';
      
      return {
        ...booking,
        customerName: booking.customer ? 
          `${booking.customer.firstName} ${booking.customer.lastName}`.trim() : 
          'Unknown Customer',
        customerPhone: booking.customer?.mobile || booking.customer?.phone || '',
        customerEmail: booking.customer?.email || '',
        serviceName: serviceName,
        staffName: booking.provider ? 
          `${booking.provider.firstName} ${booking.provider.lastName}`.trim() : 
          'Staff',
        price: booking.totalAmount,
        duration: booking.services?.[0]?.duration || 0,
        date: booking.startTime,
      };
    });
    
    // Search in transformed data
    const transformedSample = transformed.filter(b => 
      b.customerName.toUpperCase().includes('SAMPLE')
    );
    
    console.log(`\n✓ After transformation: ${transformedSample.length} SAMPLE bookings`);
    
    if (transformedSample.length > 0) {
      console.log('\nTransformed booking:');
      console.log(`- customerName: "${transformedSample[0].customerName}"`);
      console.log(`- serviceName: "${transformedSample[0].serviceName}"`);
      console.log(`- Search would find it: ${transformedSample[0].customerName.toLowerCase().includes('sample')}`);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugSampleBooking();