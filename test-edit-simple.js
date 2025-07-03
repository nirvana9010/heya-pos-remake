// Simple test to check Edit booking functionality
async function testEditBooking() {
  console.log('=== SIMPLE EDIT BOOKING TEST ===\n');
  
  // First, let's find a booking to edit using the API
  const axios = require('axios');
  const API_URL = 'http://localhost:3000/api';
  
  try {
    // Login to get a token
    console.log('1. Getting auth token...');
    const loginResponse = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      email: 'admin@hamiltonbeauty.com',
      password: 'demo123'
    });
    
    const authToken = loginResponse.data.token;
    console.log('✓ Auth token obtained\n');
    
    // Get bookings
    console.log('2. Finding an editable booking...');
    const bookingsResponse = await axios.get(`${API_URL}/v2/bookings`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 10 }
    });
    
    const bookings = bookingsResponse.data.data;
    const editableBooking = bookings.find(b => 
      b.status !== 'completed' && 
      b.status !== 'cancelled' &&
      b.status !== 'COMPLETED' &&
      b.status !== 'CANCELLED'
    );
    
    if (!editableBooking) {
      console.log('No editable bookings found');
      return;
    }
    
    console.log(`✓ Found editable booking: ${editableBooking.id}`);
    console.log(`  Status: ${editableBooking.status}`);
    console.log(`  Customer: ${editableBooking.customerName}`);
    console.log(`  Current time: ${editableBooking.startTime}\n`);
    
    // Output the URL to manually test
    console.log('3. Manual Test Instructions:');
    console.log('─'.repeat(50));
    console.log('1. Open your browser and go to: http://localhost:3002/login');
    console.log('2. Login with:');
    console.log('   - Merchant Code: HAMILTON');
    console.log('   - Email: admin@hamiltonbeauty.com');
    console.log('   - Password: demo123');
    console.log('   - PIN: 9999');
    console.log(`3. Navigate to: http://localhost:3002/bookings/${editableBooking.id}/edit`);
    console.log('4. Try changing the time and clicking "Save Changes"');
    console.log('5. Open browser DevTools Console (F12) to see debug logs');
    console.log('─'.repeat(50));
    
    // Test the API directly
    console.log('\n4. Testing API directly...');
    const currentStartTime = new Date(editableBooking.startTime);
    const newStartTime = new Date(currentStartTime.getTime() + 3 * 24 * 60 * 60 * 1000); // Add 3 days
    
    console.log(`  Changing time from: ${currentStartTime.toISOString()}`);
    console.log(`  To: ${newStartTime.toISOString()}`);
    
    try {
      const updateResponse = await axios.patch(
        `${API_URL}/v2/bookings/${editableBooking.id}`,
        { startTime: newStartTime.toISOString() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      console.log('✓ API update successful!');
      console.log(`  New time: ${updateResponse.data.startTime}`);
    } catch (error) {
      console.log('✗ API update failed:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testEditBooking();