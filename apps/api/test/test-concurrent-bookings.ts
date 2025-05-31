import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const TEST_MERCHANT_ID = 'cm3v33swh000108mhfa8tcktx'; // Update with your merchant ID

// Login and get token
async function getAuthToken() {
  const response = await axios.post(`${API_URL}/auth/merchant/login`, {
    username: 'hamilton',
    password: 'hamilton123'
  });
  return response.data.accessToken;
}

// Create a booking
async function createBooking(token: string, index: number) {
  const startTime = new Date();
  startTime.setHours(10 + index, 0, 0, 0);
  
  try {
    const response = await axios.post(
      `${API_URL}/bookings`,
      {
        customerId: 'cm3v33swh000508mhdk7z59m9', // Update with a valid customer ID
        providerId: 'cm3v33swh000308mhjfgudvkp', // Update with a valid staff ID
        locationId: 'cm3v33swh000208mh8wf29crg', // Update with a valid location ID
        startTime: startTime.toISOString(),
        services: [
          {
            serviceId: 'cm3v33swi000608mhefcn0zbo', // Update with a valid service ID
            price: 100,
            duration: 60
          }
        ],
        totalAmount: 100,
        status: 'CONFIRMED'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log(`✅ Booking ${index} created successfully: ${response.data.bookingNumber}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Booking ${index} failed:`, error.response?.data?.message || error.message);
    throw error;
  }
}

// Test concurrent booking creation
async function testConcurrentBookings() {
  console.log('Testing concurrent booking creation...\n');
  
  try {
    // Get auth token
    const token = await getAuthToken();
    console.log('✅ Authentication successful\n');
    
    // Create 5 bookings concurrently
    const bookingPromises = [];
    for (let i = 0; i < 5; i++) {
      bookingPromises.push(createBooking(token, i));
    }
    
    const results = await Promise.allSettled(bookingPromises);
    
    console.log('\n--- Results ---');
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Successful bookings: ${successful}`);
    console.log(`Failed bookings: ${failed}`);
    
    // Extract booking numbers from successful bookings
    const bookingNumbers = results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => r.value.bookingNumber);
    
    console.log('\nBooking numbers:', bookingNumbers);
    
    // Check for duplicates
    const uniqueNumbers = new Set(bookingNumbers);
    if (uniqueNumbers.size === bookingNumbers.length) {
      console.log('✅ All booking numbers are unique!');
    } else {
      console.log('❌ Duplicate booking numbers detected!');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testConcurrentBookings();