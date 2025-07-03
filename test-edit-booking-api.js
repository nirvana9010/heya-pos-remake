const axios = require('axios');

async function testEditBookingAPI() {
  const API_URL = 'http://localhost:3000/api';
  let authToken = '';
  
  try {
    console.log('=== TESTING EDIT BOOKING API ===\n');
    
    // 1. Login with merchant credentials
    console.log('1. Logging in with merchant credentials...');
    const loginResponse = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      email: 'admin@hamiltonbeauty.com',
      password: 'demo123'
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Response has token?', 'token' in loginResponse.data);
    
    // The API returns a 'token' field based on the AuthSession interface
    authToken = loginResponse.data.token;
    
    if (!authToken) {
      throw new Error('No auth token received from login');
    }
    
    console.log('✓ Login successful');
    console.log('Auth token obtained: Yes');
    console.log('');
    
    // 2. Get bookings to find one to edit
    console.log('2. Fetching bookings...');
    const bookingsResponse = await axios.get(`${API_URL}/v2/bookings`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 10 }
    });
    
    const bookings = bookingsResponse.data.data || bookingsResponse.data;
    if (!bookings || bookings.length === 0) {
      throw new Error('No bookings found');
    }
    
    // Find a booking that is not completed or cancelled
    const editableBooking = bookings.find(b => 
      b.status !== 'completed' && 
      b.status !== 'cancelled' &&
      b.status !== 'COMPLETED' &&
      b.status !== 'CANCELLED'
    );
    
    if (!editableBooking) {
      console.log('All bookings found:', bookings.map(b => ({ id: b.id, status: b.status })));
      throw new Error('No editable bookings found (all are completed or cancelled)');
    }
    
    const bookingToEdit = editableBooking;
    console.log(`✓ Found booking to edit: ${bookingToEdit.id}`);
    console.log(`  Customer: ${bookingToEdit.customerName}`);
    console.log(`  Current time: ${bookingToEdit.startTime}`);
    console.log(`  Current staff: ${bookingToEdit.staffId}\n`);
    
    // 3. Get the full booking details
    console.log('3. Getting full booking details...');
    const bookingDetailResponse = await axios.get(`${API_URL}/v2/bookings/${bookingToEdit.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const fullBooking = bookingDetailResponse.data;
    console.log('Full booking data:');
    console.log(JSON.stringify(fullBooking, null, 2));
    console.log('\n');
    
    // 4. Calculate new time (add 2 days to avoid conflicts)
    const currentStartTime = new Date(fullBooking.startTime);
    const newStartTime = new Date(currentStartTime.getTime() + 2 * 24 * 60 * 60 * 1000); // Add 2 days
    
    console.log('4. Preparing to reschedule...');
    console.log(`  Current time: ${currentStartTime.toISOString()}`);
    console.log(`  New time: ${newStartTime.toISOString()}\n`);
    
    // 5. Call the reschedule API
    console.log('5. Calling reschedule API...');
    const updateData = {
      startTime: newStartTime.toISOString(),
      staffId: fullBooking.staffId || fullBooking.providerId
    };
    
    console.log('Request data:', JSON.stringify(updateData, null, 2));
    
    try {
      const updateResponse = await axios.patch(
        `${API_URL}/v2/bookings/${bookingToEdit.id}`,
        updateData,
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('\n✓ Update successful!');
      console.log('Response:', JSON.stringify(updateResponse.data, null, 2));
      
      // 6. Verify the update
      console.log('\n6. Verifying the update...');
      const verifyResponse = await axios.get(`${API_URL}/v2/bookings/${bookingToEdit.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const updatedBooking = verifyResponse.data;
      console.log(`  New startTime: ${updatedBooking.startTime}`);
      console.log(`  Time changed: ${updatedBooking.startTime !== fullBooking.startTime}`);
      
    } catch (error) {
      console.error('\n✗ Update failed!');
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.response?.data?.message || error.message);
      console.error('Full error:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testEditBookingAPI();