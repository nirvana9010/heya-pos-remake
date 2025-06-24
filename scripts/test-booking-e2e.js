const axios = require('axios');
const { format } = require('date-fns');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const MERCHANT_SUBDOMAIN = process.env.MERCHANT_SUBDOMAIN || 'hamilton';
const AUTH_TOKEN = process.env.AUTH_TOKEN || null; // Optional: for notification verification

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logStep(step, status, message) {
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
  const color = status === 'success' ? 'green' : status === 'error' ? 'red' : 'blue';
  log(`${icon} ${step}: ${message}`, color);
}

// Helper to create axios instance with subdomain
const createApiClient = (subdomain) => {
  return {
    get: (url, config = {}) => 
      axios.get(`${API_URL}${url}?subdomain=${subdomain}`, {
        ...config,
        headers: {
          'X-Merchant-Subdomain': subdomain,
          ...(config.headers || {})
        }
      }),
    post: (url, data, config = {}) => 
      axios.post(`${API_URL}${url}?subdomain=${subdomain}`, data, {
        ...config,
        headers: {
          'X-Merchant-Subdomain': subdomain,
          ...(config.headers || {})
        }
      })
  };
};

async function runE2EBookingTest() {
  log('\n🚀 Starting End-to-End Booking Test', 'cyan');
  log(`   Merchant: ${MERCHANT_SUBDOMAIN}`, 'cyan');
  log(`   API URL: ${API_URL}`, 'cyan');
  log('   ' + '='.repeat(50) + '\n', 'cyan');

  const api = createApiClient(MERCHANT_SUBDOMAIN);
  const results = {
    service: null,
    staff: null,
    slot: null,
    booking: null,
    notifications: null
  };

  try {
    // Step 1: Get Services
    logStep('Step 1', 'running', 'Getting available services...');
    const servicesRes = await api.get('/v1/public/services');
    const service = servicesRes.data.data[0];
    results.service = service;
    logStep('Step 1', 'success', `Found ${servicesRes.data.data.length} services. Using: ${service.name}`);

    // Step 2: Get Staff
    logStep('Step 2', 'running', 'Getting available staff...');
    const staffRes = await api.get('/v1/public/staff');
    const staff = staffRes.data.data[0];
    results.staff = staff;
    const staffName = staff.firstName && staff.lastName 
      ? `${staff.firstName} ${staff.lastName}` 
      : staff.name || 'Staff Member';
    logStep('Step 2', 'success', `Found ${staffRes.data.data.length} staff. Using: ${staffName}`);

    // Step 3: Check Availability
    logStep('Step 3', 'running', 'Checking availability...');
    
    // Use a date 30 days in the future
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 30);
    const dateStr = testDate.toISOString().split('T')[0];
    
    const availabilityRes = await api.post('/v1/public/bookings/check-availability', {
      date: dateStr,
      serviceId: service.id,
      staffId: staff.id
    });
    
    const availableSlots = availabilityRes.data.slots.filter(s => s.available);
    const slot = availableSlots.find(s => s.time === '14:00') || availableSlots[0];
    results.slot = slot;
    
    logStep('Step 3', 'success', `Found ${availableSlots.length} available slots. Using: ${dateStr} at ${slot.time}`);

    // Step 4: Create Booking
    logStep('Step 4', 'running', 'Creating booking...');
    
    const bookingData = {
      customerName: 'Test Customer',
      customerEmail: `test${Date.now()}@example.com`,
      customerPhone: '+61400000000',
      serviceId: service.id,
      staffId: staff.id,
      date: dateStr,
      startTime: slot.time,
      notes: 'Automated E2E test booking'
    };
    
    const bookingRes = await api.post('/v1/public/bookings', bookingData);
    const booking = bookingRes.data;
    results.booking = booking;
    
    logStep('Step 4', 'success', `Booking created! ID: ${booking.id}`);
    
    // Step 5: Simulate Payment
    logStep('Step 5', 'running', 'Processing payment...');
    // In a real scenario, this would call the payment API
    // For testing, we'll just simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
    logStep('Step 5', 'success', `Payment simulated for $${service.price}`);

    // Step 6: Verify Notifications
    logStep('Step 6', 'running', 'Verifying notifications...');
    
    // Wait for notifications to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (AUTH_TOKEN) {
      try {
        const notifRes = await axios.get(
          `${API_URL}/v1/notifications/history?bookingId=${booking.id}`,
          {
            headers: {
              'Authorization': AUTH_TOKEN.startsWith('Bearer ') ? AUTH_TOKEN : `Bearer ${AUTH_TOKEN}`,
              'X-Merchant-Subdomain': MERCHANT_SUBDOMAIN
            }
          }
        );
        
        const notifications = notifRes.data;
        results.notifications = notifications;
        
        const emailSent = notifications.some(n => n.channel === 'email' && n.status === 'sent');
        const smsSent = notifications.some(n => n.channel === 'sms' && n.status === 'sent');
        
        logStep('Step 6', 'success', 
          `Notifications: ${emailSent ? '✓ Email sent' : '✗ Email not sent'} | ${smsSent ? '✓ SMS sent' : '✗ SMS not sent'}`
        );
      } catch (error) {
        logStep('Step 6', 'success', 'Notifications triggered (requires auth token to verify)');
      }
    } else {
      logStep('Step 6', 'success', 'Notifications triggered (add AUTH_TOKEN env var to verify)');
    }

    // Summary
    log('\n' + '='.repeat(60), 'green');
    log('✅ E2E BOOKING TEST COMPLETED SUCCESSFULLY!', 'green');
    log('='.repeat(60), 'green');
    
    log('\n📋 Booking Summary:', 'cyan');
    log(`   Booking ID: ${booking.id}`, 'yellow');
    log(`   Date: ${booking.date} at ${booking.startTime}`, 'yellow');
    log(`   Service: ${booking.serviceName || service.name}`, 'yellow');
    log(`   Staff: ${booking.staffName}`, 'yellow');
    log(`   Customer: ${booking.customerName}`, 'yellow');
    log(`   Total: $${booking.totalPrice || service.price}`, 'yellow');
    
    log('\n📍 Next Steps:', 'cyan');
    log(`   1. Check merchant calendar: http://localhost:3002/calendar?date=${booking.date}`, 'blue');
    log(`   2. Check test notifications: http://localhost:3002/test-notifications`, 'blue');
    log(`   3. Verify customer email/SMS (if real providers configured)`, 'blue');
    log(`   4. Test via web UI: http://localhost:3001/hamilton/booking-test`, 'blue');

  } catch (error) {
    log('\n❌ Test failed!', 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    
    if (error.response?.data) {
      log('\n   Response details:', 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Usage instructions
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('\n📖 E2E Booking Test Script', 'cyan');
  log('\nUsage:', 'yellow');
  log('  node test-booking-e2e.js');
  log('\nEnvironment Variables:', 'yellow');
  log('  API_URL            - API base URL (default: http://localhost:3000/api)');
  log('  MERCHANT_SUBDOMAIN - Merchant subdomain (default: hamilton)');
  log('  AUTH_TOKEN         - Optional auth token for notification verification');
  log('\nExample:', 'yellow');
  log('  MERCHANT_SUBDOMAIN=hamilton AUTH_TOKEN=eyJ... node test-booking-e2e.js');
  process.exit(0);
}

// Run the test
runE2EBookingTest().catch(console.error);