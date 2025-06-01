import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testAllBookings() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123',
    });

    const token = (loginResponse.data as any).token;
    const api = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });

    // Get ALL bookings by fetching multiple pages
    console.log('=== FETCHING ALL BOOKINGS ===\n');
    
    let allBookings: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await api.get('/bookings', {
        params: { includeAll: true, page, limit: 50 }
      });
      const data = (response.data as any).data;
      allBookings = allBookings.concat(data);
      
      console.log(`Page ${page}: ${data.length} bookings`);
      
      hasMore = data.length === 50;
      page++;
    }
    
    console.log(`\nTotal bookings fetched: ${allBookings.length}`);
    
    // Analyze date distribution
    const dateCount = new Map<string, number>();
    let futureCount = 0;
    let todayCount = 0;
    let pastCount = 0;
    
    const today = new Date('2025-06-01');
    today.setHours(0, 0, 0, 0);
    
    allBookings.forEach((booking: any) => {
      const bookingDate = new Date(booking.startTime);
      const dateStr = bookingDate.toISOString().split('T')[0];
      dateCount.set(dateStr, (dateCount.get(dateStr) || 0) + 1);
      
      if (bookingDate >= today) {
        if (dateStr === '2025-06-01') {
          todayCount++;
        } else {
          futureCount++;
        }
      } else {
        pastCount++;
      }
    });
    
    console.log('\n=== BOOKING ANALYSIS ===');
    console.log(`Past bookings: ${pastCount}`);
    console.log(`Today's bookings (June 1): ${todayCount}`);
    console.log(`Future bookings: ${futureCount}`);
    
    // Show all dates with bookings
    console.log('\n=== ALL DATES WITH BOOKINGS ===');
    const sortedDates = Array.from(dateCount.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sortedDates.forEach(([date, count]) => {
      const marker = date === '2025-06-01' ? ' <- TODAY' : 
                     date > '2025-06-01' ? ' <- FUTURE' : '';
      console.log(`${date}: ${count} bookings${marker}`);
    });

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAllBookings();