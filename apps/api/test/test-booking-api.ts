import axios from 'axios';

interface BookingResponse {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function testBookingAPI() {
  try {
    // First, let's get a token by logging in
    console.log('Testing booking API date filtering...\n');
    
    const loginResponse = await axios.post<{token: string}>('http://localhost:3000/api/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, got token');
    
    // Test 1: Get bookings for June 1st using date parameter
    console.log('\nTest 1: Fetching bookings with date=2025-06-01');
    const response1 = await axios.get<BookingResponse>('http://localhost:3000/api/bookings', {
      params: { date: '2025-06-01' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${response1.data.data.length} bookings`);
    if (response1.data.data.length > 0) {
      console.log('First booking:', {
        date: new Date(response1.data.data[0].startTime).toLocaleString(),
        customer: response1.data.data[0].customer.firstName + ' ' + response1.data.data[0].customer.lastName
      });
    }
    
    // Test 2: Get all bookings without date filter
    console.log('\nTest 2: Fetching bookings without date filter (default behavior)');
    const response2 = await axios.get<BookingResponse>('http://localhost:3000/api/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${response2.data.data.length} bookings (showing upcoming only by default)`);
    
    // Test 3: Get all bookings including past
    console.log('\nTest 3: Fetching all bookings with includeAll=true');
    const response3 = await axios.get<BookingResponse>('http://localhost:3000/api/bookings', {
      params: { includeAll: true },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${response3.data.data.length} bookings total`);
    
    // Count June 1st bookings
    const june1stBookings = response3.data.data.filter((b: any) => {
      const date = new Date(b.startTime);
      return date.toISOString().startsWith('2025-06-01');
    });
    
    console.log(`\nJune 1st bookings in total: ${june1stBookings.length}`);
    
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBookingAPI();