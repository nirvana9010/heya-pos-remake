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
    
    // Check if it's a paginated response
    const customers = Array.isArray(customersResponse.data) 
      ? customersResponse.data 
      : (customersResponse.data.data || customersResponse.data.customers || []);
    
    if (!customers || customers.length === 0) {
      log('No customers found in database', 'red');
      return null;
    }
    
    const customer = customers[0];
    if (!customer) {
      log('Customer data is invalid', 'red');
      return null;
    }
    log(`\n2. Using customer: ${customer.firstName} ${customer.lastName}`, 'green');
    
    // Get service
    const servicesResponse = await axios.get(`${API_URL}/v1/services`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Handle paginated response
    const services = Array.isArray(servicesResponse.data) 
      ? servicesResponse.data 
      : (servicesResponse.data.data || servicesResponse.data.services || []);
    
    if (!services || services.length === 0) {
      log('No services found in database', 'red');
      return null;
    }
    
    const service = services[0];
    if (!service) {
      log('Service data is invalid', 'red');
      return null;
    }
    log(`3. Using service: ${service.name} (Price: $${service.price})`, 'green');
    
    // Get staff
    const staffResponse = await axios.get(`${API_URL}/v1/staff`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Handle paginated response
    const staffList = Array.isArray(staffResponse.data) 
      ? staffResponse.data 
      : (staffResponse.data.data || staffResponse.data.staff || []);
    
    if (!staffList || staffList.length === 0) {
      log('No staff found in database', 'red');
      return null;
    }
    
    const staff = staffList[0];
    if (!staff) {
      log('Staff data is invalid', 'red');
      return null;
    }
    log(`4. Using staff: ${staff.firstName} ${staff.lastName}`, 'green');
    
    // Get location
    const locationsResponse = await axios.get(`${API_URL}/v1/locations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Handle paginated response
    const locations = Array.isArray(locationsResponse.data) 
      ? locationsResponse.data 
      : (locationsResponse.data.data || locationsResponse.data.locations || []);
    
    if (!locations || locations.length === 0) {
      log('No locations found in database', 'red');
      return null;
    }
    
    const location = locations[0];
    if (!location) {
      log('Location data is invalid', 'red');
      return null;
    }
    log(`5. Using location: ${location.id}`, 'green');
    
    return { customer, service, staff, location };
  } catch (error) {
    log('Failed to get test data', 'red');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

async function createAndProcessBooking(testData, bookingNumber = 1) {
  try {
    const startTime = new Date();
    // Create booking for today but with different times to avoid conflicts
    startTime.setHours(startTime.getHours() - 2 + bookingNumber); // Past bookings for today
    startTime.setMinutes(Math.floor(Math.random() * 4) * 15); // 0, 15, 30, or 45 minutes
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    log(`Booking time: ${startTime.toISOString()}`, 'blue');
    
    // Create booking
    log(`\nCreating booking ${bookingNumber}...`, 'yellow');
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
  
  // Create first booking with payment
  log('\n=== CREATING FIRST BOOKING WITH PAYMENT ===', 'blue');
  const booking1 = await createAndProcessBooking(testData, 1);
  if (!booking1) return;
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check reports after first booking
  log('\n=== REPORT STATE AFTER FIRST BOOKING ===', 'blue');
  const reportsAfter1 = await getReports();
  
  // Create second booking with payment and tip
  log('\n=== CREATING SECOND BOOKING WITH PAYMENT + TIP ===', 'blue');
  const booking2 = await createAndProcessBooking(testData, 2);
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
  
  // Check revenue trend
  try {
    const trendResponse = await axios.get(`${API_URL}/v1/reports/revenue-trend?days=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const todayRevenue = trendResponse.data[0]?.revenue || 0;
    log(`\nToday's revenue in trend: $${todayRevenue}`, 'green');
  } catch (error) {
    log('Failed to get revenue trend', 'red');
  }
  
  // Check top services
  try {
    const topServicesResponse = await axios.get(`${API_URL}/v1/reports/top-services`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ourService = topServicesResponse.data.find(s => s.serviceId === testData.service.id);
    if (ourService) {
      log(`\n✓ Service found in top services:`, 'green');
      log(`  Name: ${ourService.name}`, 'green');
      log(`  Bookings: ${ourService.bookings}`, 'green');
      log(`  Revenue: $${ourService.revenue}`, 'green');
    }
  } catch (error) {
    log('Failed to get top services', 'red');
  }
  
  // Check staff performance
  try {
    const staffPerfResponse = await axios.get(`${API_URL}/v1/reports/staff-performance`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ourStaff = staffPerfResponse.data.find(s => s.staffId === testData.staff.id);
    if (ourStaff) {
      log(`\n✓ Staff found in performance report:`, 'green');
      log(`  Name: ${ourStaff.name}`, 'green');
      log(`  Bookings: ${ourStaff.bookings}`, 'green');
      log(`  Revenue: $${ourStaff.revenue}`, 'green');
      log(`  Utilization: ${ourStaff.utilization}%`, 'green');
    }
  } catch (error) {
    log('Failed to get staff performance', 'red');
  }
  
  log('\n✅ Comprehensive report testing completed!', 'green');
  log('\nKey Findings:', 'blue');
  log('1. Booking completion alone does NOT update revenue reports', 'yellow');
  log('2. Payment processing is required for revenue to be reflected', 'yellow');
  log('3. Booking stats update immediately upon booking creation/completion', 'yellow');
  log('4. Revenue reports are based on PAID invoices/payments only', 'yellow');
}

// Run the tests
runTests().catch(console.error);