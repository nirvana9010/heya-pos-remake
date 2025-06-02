import axios from 'axios';

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: any;
}

interface BookingsResponse {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const API_URL = 'http://localhost:3000/api';

async function testJune1Api() {
  try {
    // Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post<LoginResponse>(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Create axios instance with auth
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Test 1: Get bookings without date filter
    console.log('\n2. Getting ALL bookings (no date filter):');
    const allBookingsResponse = await api.get<BookingsResponse>('/bookings?includeAll=true');
    console.log(`   Total bookings: ${allBookingsResponse.data.data.length}`);
    
    // Test 2: Get bookings for June 1
    console.log('\n3. Getting bookings for June 1, 2025:');
    const june1Response = await api.get<BookingsResponse>('/bookings?date=2025-06-01');
    console.log(`   Bookings on June 1: ${june1Response.data.data.length}`);
    
    if (june1Response.data.data.length > 0) {
      console.log('   Sample bookings:');
      june1Response.data.data.slice(0, 3).forEach((booking: any) => {
        console.log(`   - ${booking.customer.firstName} ${booking.customer.lastName}: ${new Date(booking.startTime).toLocaleString()}`);
      });
    }
    
    // Test 3: Get bookings for today
    console.log('\n4. Getting bookings for today (June 2, 2025):');
    const todayResponse = await api.get<BookingsResponse>('/bookings?date=2025-06-02');
    console.log(`   Bookings today: ${todayResponse.data.data.length}`);
    
    // Test 4: Get bookings using date range
    console.log('\n5. Getting bookings for May 31 - June 2:');
    const rangeResponse = await api.get<BookingsResponse>('/bookings?startDate=2025-05-31&endDate=2025-06-02');
    console.log(`   Bookings in range: ${rangeResponse.data.data.length}`);
    
    // Group by date to see distribution
    const byDate: Record<string, number> = {};
    rangeResponse.data.data.forEach((booking: any) => {
      const date = new Date(booking.startTime).toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });
    
    console.log('   Distribution by date:');
    Object.entries(byDate).sort().forEach(([date, count]) => {
      console.log(`   - ${date}: ${count} bookings`);
    });
    
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testJune1Api();