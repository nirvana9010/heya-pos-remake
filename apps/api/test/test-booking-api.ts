import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testBookingAPI() {
  try {
    // First, let's login to get a token
    console.log('=== TESTING BOOKING API ===\n');
    console.log('1. Logging in...');
    
    const loginResponse = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123',
    });

    const token = (loginResponse.data as any).token;
    console.log('Login successful, token received\n');

    // Create axios instance with auth header
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Test 1: Get upcoming bookings (default)
    console.log('2. Testing default query (upcoming bookings)...');
    const upcomingResponse = await api.get('/bookings');
    const upcomingData = (upcomingResponse.data as any).data;
    console.log(`Found ${upcomingData.length} upcoming bookings`);
    if (upcomingData.length > 0) {
      const firstBooking = upcomingData[0];
      console.log(`First booking date: ${firstBooking.startTime}`);
    }

    // Test 2: Get all bookings
    console.log('\n3. Testing with includeAll=true...');
    const allResponse = await api.get('/bookings?includeAll=true');
    const allData = (allResponse.data as any).data;
    console.log(`Found ${allData.length} total bookings`);

    // Test 3: Get bookings for a specific date
    console.log('\n4. Testing with specific date (June 1, 2025)...');
    const june1Response = await api.get('/bookings?date=2025-06-01');
    const june1Data = (june1Response.data as any).data;
    console.log(`Found ${june1Data.length} bookings for June 1, 2025`);

    // Test 4: Get bookings with date range
    console.log('\n5. Testing with date range (May 1-15, 2025)...');
    const rangeResponse = await api.get('/bookings?startDate=2025-05-01&endDate=2025-05-15');
    const rangeData = (rangeResponse.data as any).data;
    console.log(`Found ${rangeData.length} bookings for May 1-15, 2025`);

    // Test 5: Get past bookings
    console.log('\n6. Testing past bookings...');
    const today = new Date().toISOString().split('T')[0];
    const pastResponse = await api.get(`/bookings?endDate=${today}&includeAll=true`);
    const pastData = (pastResponse.data as any).data;
    console.log(`Found ${pastData.length} past bookings`);

    // Show date distribution
    console.log('\n=== DATE DISTRIBUTION ===');
    const dateCount = new Map<string, number>();
    allData.forEach((booking: any) => {
      const date = new Date(booking.startTime).toISOString().split('T')[0];
      dateCount.set(date, (dateCount.get(date) || 0) + 1);
    });

    const sortedDates = Array.from(dateCount.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    console.log('Top 10 dates with most bookings:');
    sortedDates.slice(0, 10).forEach(([date, count]) => {
      console.log(`${date}: ${count} bookings`);
    });

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBookingAPI();