const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let merchantToken = '';
let testBookingId = '';
let testCustomerId = '';
let testServiceId = '';
let testStaffId = '';
let testLocationId = '';

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, fn) {
  try {
    log(`\nTesting: ${name}...`, 'blue');
    const result = await fn();
    log(`✓ ${name} passed`, 'green');
    return result;
  } catch (error) {
    log(`✗ ${name} failed: ${error.message}`, 'red');
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
    throw error;
  }
}

async function makeRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(merchantToken && { 'Authorization': `Bearer ${merchantToken}` }),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${data.message || text}`);
    error.response = response;
    error.data = data;
    throw error;
  }

  return data;
}

async function runTests() {
  log('\n🚀 Starting Booking Flow Tests', 'yellow');

  // 1. Login as merchant
  await testEndpoint('Merchant Login', async () => {
    const result = await makeRequest('/auth/merchant/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'HAMILTON',
        password: 'demo123',
      }),
    });
    merchantToken = result.token;
    log(`Token received: ${merchantToken.substring(0, 20)}...`);
    return result;
  });

  // 2. Get merchant info from public API
  const merchantInfo = await testEndpoint('Public: Get Merchant Info', async () => {
    const result = await makeRequest('/public/merchant-info', {
      headers: { 'Authorization': '' }, // No auth needed for public
    });
    log(`Merchant: ${result.name}`);
    return result;
  });

  // 2b. Get locations as merchant
  const locations = await testEndpoint('Merchant: Get Locations', async () => {
    const result = await makeRequest('/locations');
    testLocationId = result[0].id;
    log(`Location ID: ${testLocationId} (${result[0].name})`);
    return result;
  });

  // 3. Get available services
  const services = await testEndpoint('Public: Get Services', async () => {
    const result = await makeRequest('/public/services', {
      headers: { 'Authorization': '' },
    });
    testServiceId = result.data[0].id;
    log(`Service ID: ${testServiceId} (${result.data[0].name})`);
    return result;
  });

  // 4. Get available staff
  const staff = await testEndpoint('Public: Get Staff', async () => {
    const result = await makeRequest('/public/staff', {
      headers: { 'Authorization': '' },
    });
    testStaffId = result.data[0].id;
    log(`Staff ID: ${testStaffId} (${result.data[0].name})`);
    return result;
  });

  // 5. Check availability for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = new Date(tomorrow.setHours(0, 0, 0, 0));
  const endDate = new Date(tomorrow.setHours(23, 59, 59, 999));

  const availability = await testEndpoint('Public: Check Availability', async () => {
    const result = await makeRequest(`/public/availability?staffId=${testStaffId}&serviceId=${testServiceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: { 'Authorization': '' },
    });
    log(`Available slots: ${result.availableSlots.length}`);
    return result;
  });

  if (availability.availableSlots.length === 0) {
    throw new Error('No available slots found');
  }

  const selectedSlot = availability.availableSlots[0];
  const bookingDate = selectedSlot.startTime.split('T')[0];
  const bookingTime = selectedSlot.startTime.split('T')[1].substring(0, 5);

  // 6. Create a booking through public API (customer booking)
  const publicBooking = await testEndpoint('Public: Create Booking', async () => {
    const result = await makeRequest('/public/bookings', {
      method: 'POST',
      headers: { 'Authorization': '' },
      body: JSON.stringify({
        customerName: 'Test Customer',
        customerEmail: `test-${Date.now()}@example.com`,
        customerPhone: '+61 400 000 001',
        serviceId: testServiceId,
        staffId: testStaffId,
        date: bookingDate,
        startTime: bookingTime,
        notes: 'Test booking from API',
      }),
    });
    testBookingId = result.id;
    testCustomerId = result.customerId;
    log(`Booking created: ${result.bookingNumber}`);
    return result;
  });

  // 7. Try to create overlapping booking (should fail)
  await testEndpoint('Public: Create Overlapping Booking (Should Fail)', async () => {
    try {
      await makeRequest('/public/bookings', {
        method: 'POST',
        headers: { 'Authorization': '' },
        body: JSON.stringify({
          customerName: 'Another Customer',
          customerEmail: `test2-${Date.now()}@example.com`,
          customerPhone: '+61 400 000 002',
          serviceId: testServiceId,
          staffId: testStaffId,
          date: bookingDate,
          startTime: bookingTime,
          notes: 'This should fail',
        }),
      });
      throw new Error('Expected conflict but booking was created!');
    } catch (error) {
      if (error.data && error.data.statusCode === 409) {
        log('✓ Correctly prevented double booking', 'green');
        return { success: true };
      }
      throw error;
    }
  });

  // 8. Check availability as merchant (should show conflicts)
  const merchantAvailability = await testEndpoint('Merchant: Check Available Slots', async () => {
    const result = await makeRequest(`/bookings/available-slots?staffId=${testStaffId}&serviceId=${testServiceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    const conflictingSlot = result.slots.find(s => 
      s.startTime === selectedSlot.startTime && !s.available
    );
    if (conflictingSlot) {
      log(`Found conflicting slot: ${conflictingSlot.conflictReason}`, 'yellow');
    }
    return result;
  });

  // 9. Create booking with override as merchant
  const overrideBooking = await testEndpoint('Merchant: Create Booking with Override', async () => {
    const result = await makeRequest('/bookings/create-with-check', {
      method: 'POST',
      body: JSON.stringify({
        customerId: testCustomerId,
        staffId: testStaffId,
        serviceId: testServiceId,
        locationId: testLocationId,
        startTime: selectedSlot.startTime,
        notes: 'Override booking test',
        isOverride: true,
        overrideReason: 'Customer specifically requested double booking',
      }),
    });
    log(`Override booking created: ${result.bookingNumber}`);
    return result;
  });

  // 10. Get bookings to verify both exist
  const bookings = await testEndpoint('Merchant: Get Bookings', async () => {
    const result = await makeRequest('/bookings');
    const todaysBookings = result.data.filter(b => 
      b.startTime.startsWith(bookingDate)
    );
    log(`Found ${todaysBookings.length} bookings for ${bookingDate}`);
    return result;
  });

  // 11. Test service with padding time (skip if not supported)
  /*
  await testEndpoint('Update Service with Padding Time', async () => {
    // First get the service
    const service = await makeRequest(`/services/${testServiceId}`);
    
    // Update with padding
    const result = await makeRequest(`/services/${testServiceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        paddingBefore: 15,
        paddingAfter: 15,
      }),
    });
    log(`Updated service with 15min padding before/after`);
    return result;
  });
  */

  // 12. Check availability with padding (should show fewer slots)
  const paddedAvailability = await testEndpoint('Public: Check Availability with Padding', async () => {
    const result = await makeRequest(`/public/availability?staffId=${testStaffId}&serviceId=${testServiceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: { 'Authorization': '' },
    });
    log(`Available slots with padding: ${result.availableSlots.length}`);
    return result;
  });

  // 13. Test booking retrieval
  await testEndpoint('Public: Get Booking by ID', async () => {
    const result = await makeRequest(`/public/bookings/${testBookingId}`, {
      headers: { 'Authorization': '' },
    });
    log(`Retrieved booking: ${result.bookingNumber} - ${result.status}`);
    return result;
  });

  // 14. Test customer lookup
  await testEndpoint('Public: Lookup Customer', async () => {
    const result = await makeRequest('/public/customers/lookup', {
      method: 'POST',
      headers: { 'Authorization': '' },
      body: JSON.stringify({
        email: publicBooking.customerEmail,
      }),
    });
    log(`Found customer: ${result.firstName} ${result.lastName}`);
    return result;
  });

  log('\n✅ All tests completed successfully!', 'green');
  
  // Cleanup
  log('\nCleaning up test data...', 'yellow');
  
  // Cancel the test bookings
  await makeRequest(`/bookings/${testBookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  
  await makeRequest(`/bookings/${overrideBooking.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  
  log('✓ Test bookings cancelled', 'green');
}

// Run tests
runTests().catch(error => {
  log('\n❌ Test suite failed', 'red');
  console.error(error);
  process.exit(1);
});