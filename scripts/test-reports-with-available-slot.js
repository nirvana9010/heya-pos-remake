const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let token = '';
let merchantId = '';

// Colors for console output
const colors = {
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function authenticate() {
  try {
    log('1. Authenticating as merchant...', 'yellow');
    const response = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    token = response.data.token || response.data.access_token;
    merchantId = response.data.user.merchantId;
    log('✓ Authenticated successfully', 'green');
    log(`Merchant ID: ${merchantId}`, 'blue');
    return true;
  } catch (error) {
    log('Failed to authenticate', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function findAvailableTimeSlot(staffId, serviceId, locationId) {
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(9, 0, 0, 0); // Start from 9 AM today
    
    for (let days = 0; days < 7; days++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + days);
      
      for (let hour = 9; hour < 17; hour++) { // 9 AM to 5 PM
        for (let minute = 0; minute < 60; minute += 30) { // 30-minute intervals
          const testTime = new Date(checkDate);
          testTime.setHours(hour, minute, 0, 0);
          
          // Skip past times
          if (testTime < now) continue;
          
          try {
            // Check availability
            const availResponse = await axios.get(`${API_URL}/v2/bookings/availability`, {
              params: {
                staffId,
                serviceId,
                locationId,
                date: testTime.toISOString().split('T')[0],
                startTime: testTime.toISOString()
              },
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (availResponse.data.available) {
              log(`Found available slot: ${testTime.toISOString()}`, 'green');
              return testTime;
            }
          } catch (err) {
            // Continue to next slot
          }
        }
      }
    }
    
    log('No available time slots found in the next 7 days', 'red');
    return null;
  } catch (error) {
    log('Error finding available slot', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function getReports() {
  try {
    const response = await axios.get(`${API_URL}/v1/reports/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = response.data;
    log('\nGetting current report data...', 'yellow');
    log(`Daily Revenue: $${data.revenue.revenue.daily}`, 'green');
    log(`Monthly Revenue: $${data.revenue.revenue.monthly}`, 'green');
    log(`Total Bookings: ${data.bookings.bookings.total}`, 'green');
    log(`Completed Bookings: ${data.bookings.bookings.completed}`, 'green');
    log(`Total Customers: ${data.customers.customers.total}`, 'green');
    
    return data;
  } catch (error) {
    log('Failed to get reports', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function getTestData() {
  try {
    // Get customer
    const customersResponse = await axios.get(`${API_URL}/v1/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const customers = Array.isArray(customersResponse.data) 
      ? customersResponse.data 
      : (customersResponse.data.data || customersResponse.data.customers || []);
    
    if (!customers || customers.length === 0) {
      log('No customers found in database', 'red');
      return null;
    }
    
    const customer = customers[0];
    log(`\n2. Using customer: ${customer.firstName} ${customer.lastName}`, 'green');
    
    // Get service
    const servicesResponse = await axios.get(`${API_URL}/v1/services`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const services = Array.isArray(servicesResponse.data) 
      ? servicesResponse.data 
      : (servicesResponse.data.data || servicesResponse.data.services || []);
    
    if (!services || services.length === 0) {
      log('No services found in database', 'red');
      return null;
    }
    
    const service = services[0];
    log(`3. Using service: ${service.name} (Price: $${service.price})`, 'green');
    
    // Get staff
    const staffResponse = await axios.get(`${API_URL}/v1/staff`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const staffList = Array.isArray(staffResponse.data) 
      ? staffResponse.data 
      : (staffResponse.data.data || staffResponse.data.staff || []);
    
    if (!staffList || staffList.length === 0) {
      log('No staff found in database', 'red');
      return null;
    }
    
    const staff = staffList[0];
    log(`4. Using staff: ${staff.firstName} ${staff.lastName}`, 'green');
    
    // Get location
    const locationsResponse = await axios.get(`${API_URL}/v1/locations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const locations = Array.isArray(locationsResponse.data) 
      ? locationsResponse.data 
      : (locationsResponse.data.data || locationsResponse.data.locations || []);
    
    if (!locations || locations.length === 0) {
      log('No locations found in database', 'red');
      return null;
    }
    
    const location = locations[0];
    log(`5. Using location: ${location.id}`, 'green');
    
    return { customer, service, staff, location };
  } catch (error) {
    log('Failed to get test data', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function createAndProcessBooking(testData, startTime, bookingNumber = 1) {
  try {
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    // Create booking
    log(`\nCreating booking ${bookingNumber}...`, 'yellow');
    log(`Booking time: ${startTime.toISOString()}`, 'blue');
    
    const bookingResponse = await axios.post(`${API_URL}/v2/bookings`, {
      customerId: testData.customer.id,
      staffId: testData.staff.id,
      serviceId: testData.service.id,
      locationId: testData.location.id,
      startTime: startTime.toISOString(),
      notes: `Test booking ${bookingNumber} for reports verification`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const bookingId = bookingResponse.data.id;
    log(`✓ Created booking ID: ${bookingId}`, 'green');
    
    // Start booking
    await axios.patch(`${API_URL}/v2/bookings/${bookingId}/start`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    log('✓ Booking started', 'green');
    
    // Complete booking
    await axios.patch(`${API_URL}/v2/bookings/${bookingId}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    log('✓ Booking completed', 'green');
    
    // Create order from booking
    log('Creating order from booking...', 'yellow');
    const orderResponse = await axios.post(`${API_URL}/v1/payments/orders/from-booking/${bookingId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const order = orderResponse.data;
    log(`✓ Created order ID: ${order.id} (Total: $${order.totalAmount})`, 'green');
    
    // Lock the order first
    log('Locking order...', 'yellow');
    await axios.post(`${API_URL}/v1/payments/orders/${order.id}/state`, {
      state: 'LOCKED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    log('✓ Order locked', 'green');
    
    // Process payment
    log('Processing payment...', 'yellow');
    const paymentResponse = await axios.post(`${API_URL}/v1/payments/process`, {
      orderId: order.id,
      method: 'CASH',
      amount: order.totalAmount,
      tipAmount: bookingNumber === 2 ? 10 : 0  // Add tip on second booking
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    log(`✓ Payment processed successfully`, 'green');
    
    return {
      bookingId,
      orderId: order.id,
      amount: parseFloat(order.totalAmount)
    };
  } catch (error) {
    log(`Failed to create/process booking ${bookingNumber}`, 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  // Authenticate
  if (!await authenticate()) {
    return;
  }
  
  // Get initial reports
  log('\n=== INITIAL REPORT STATE ===', 'blue');
  const initialReports = await getReports();
  if (!initialReports) return;
  
  // Get test data
  const testData = await getTestData();
  if (!testData) return;
  
  // Find available time slots
  log('\n=== FINDING AVAILABLE TIME SLOTS ===', 'blue');
  const slot1 = await findAvailableTimeSlot(testData.staff.id, testData.service.id, testData.location.id);
  if (!slot1) {
    log('Cannot proceed without available time slot', 'red');
    return;
  }
  
  // Find second slot (at least 2 hours after first)
  const slot2 = new Date(slot1);
  slot2.setHours(slot2.getHours() + 2);
  
  // Create first booking with payment
  log('\n=== CREATING FIRST BOOKING WITH PAYMENT ===', 'blue');
  const booking1 = await createAndProcessBooking(testData, slot1, 1);
  if (!booking1) return;
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check reports after first booking
  log('\n=== REPORT STATE AFTER FIRST BOOKING ===', 'blue');
  const reportsAfter1 = await getReports();
  
  // Create second booking with payment and tip
  log('\n=== CREATING SECOND BOOKING WITH PAYMENT + TIP ===', 'blue');
  const booking2 = await createAndProcessBooking(testData, slot2, 2);
  if (!booking2) return;
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check final reports
  log('\n=== FINAL REPORT STATE ===', 'blue');
  const finalReports = await getReports();
  
  // Calculate changes
  log('\n=== SUMMARY OF CHANGES ===', 'blue');
  const dailyRevenueDiff = finalReports.revenue.revenue.daily - initialReports.revenue.revenue.daily;
  const monthlyRevenueDiff = finalReports.revenue.revenue.monthly - initialReports.revenue.revenue.monthly;
  const bookingsDiff = finalReports.bookings.bookings.total - initialReports.bookings.bookings.total;
  const completedDiff = finalReports.bookings.bookings.completed - initialReports.bookings.bookings.completed;
  
  log(`Daily revenue increased by: $${dailyRevenueDiff}`, 'green');
  log(`Monthly revenue increased by: $${monthlyRevenueDiff}`, 'green');
  log(`Total bookings increased by: ${bookingsDiff}`, 'green');
  log(`Completed bookings increased by: ${completedDiff}`, 'green');
  
  const expectedRevenue = booking1.amount + booking2.amount + 10; // Including tip
  log(`\nExpected revenue increase: $${expectedRevenue}`, 'blue');
  log(`Actual revenue increase: $${monthlyRevenueDiff}`, monthlyRevenueDiff === expectedRevenue ? 'green' : 'red');
  
  // Check if we created bookings for today
  if (slot1.toDateString() === new Date().toDateString()) {
    log('\n✓ Created bookings for today - revenue should be reflected in daily stats', 'green');
  } else {
    log(`\n⚠️ Created bookings for ${slot1.toDateString()} - revenue may not appear in today's stats`, 'yellow');
  }
  
  log('\n✅ Comprehensive report testing completed!', 'green');
}

// Run the tests
runTests().catch(console.error);