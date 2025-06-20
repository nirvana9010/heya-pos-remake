#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TOKEN = process.env.AUTH_TOKEN || '';

if (!TOKEN) {
  console.error('ERROR: No auth token provided.');
  console.log('Usage: AUTH_TOKEN=your_token node test-booking-rules.js');
  process.exit(1);
}

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// HTTP client
async function makeRequest(method, path, data = null, version = 'v1') {
  const url = new URL(`${API_URL}/${version}${path}`);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Helper to add hours to current time
function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// Format date for display
function formatDate(date) {
  return date.toLocaleString('en-AU', { 
    timeZone: 'Australia/Sydney',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Test booking creation
async function testBookingCreation(hoursFromNow, expectedToWork) {
  const bookingTime = addHours(new Date(), hoursFromNow);
  
  try {
    // Get test data
    const [customersRes, servicesRes, staffRes] = await Promise.all([
      makeRequest('GET', '/customers?limit=1'),
      makeRequest('GET', '/services?limit=1'),
      makeRequest('GET', '/staff?limit=1')
    ]);

    if (!customersRes.data?.[0] || !servicesRes.data?.[0] || !staffRes.data?.[0]) {
      throw new Error('Missing test data (customer, service, or staff)');
    }

    // Attempt to create booking
    const bookingData = {
      customerId: customersRes.data[0].id,
      serviceId: servicesRes.data[0].id,
      staffId: staffRes.data[0].id,
      startTime: bookingTime.toISOString(),
      notes: `Test booking ${hoursFromNow}h ahead`
    };

    const response = await makeRequest('POST', '/bookings', bookingData, 'v2');
    
    if (response.status === 200 || response.status === 201) {
      // Booking created
      if (expectedToWork) {
        return { 
          success: true, 
          message: 'Booking created successfully',
          bookingId: response.data?.id 
        };
      } else {
        // Clean up - shouldn't have been allowed
        if (response.data?.id) {
          await makeRequest('PATCH', `/bookings/${response.data.id}/cancel`, { reason: 'Test cleanup' }, 'v2');
        }
        return { 
          success: false, 
          message: 'Booking was created but should have been blocked' 
        };
      }
    } else {
      // Booking failed
      if (!expectedToWork) {
        return { 
          success: true, 
          message: `Correctly blocked: ${response.data?.message || 'Advance booking hours enforced'}` 
        };
      } else {
        return { 
          success: false, 
          message: `Failed unexpectedly: ${response.data?.message || response.status}` 
        };
      }
    }
  } catch (error) {
    if (!expectedToWork) {
      return { 
        success: true, 
        message: 'Correctly blocked (exception thrown)' 
      };
    }
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}

// Test booking cancellation
async function testBookingCancellation(hoursUntilStart, expectedToWork) {
  try {
    // First create a booking to cancel
    const bookingTime = addHours(new Date(), hoursUntilStart);
    
    // Get test data
    const [customersRes, servicesRes, staffRes] = await Promise.all([
      makeRequest('GET', '/customers?limit=1'),
      makeRequest('GET', '/services?limit=1'),
      makeRequest('GET', '/staff?limit=1')
    ]);

    if (!customersRes.data?.[0] || !servicesRes.data?.[0] || !staffRes.data?.[0]) {
      throw new Error('Missing test data');
    }

    // Create booking
    const bookingData = {
      customerId: customersRes.data[0].id,
      serviceId: servicesRes.data[0].id,
      staffId: staffRes.data[0].id,
      startTime: bookingTime.toISOString(),
      notes: `Test booking for cancellation`
    };

    const createResponse = await makeRequest('POST', '/bookings', bookingData, 'v2');
    
    if (createResponse.status !== 200 && createResponse.status !== 201) {
      throw new Error('Could not create test booking');
    }

    const bookingId = createResponse.data.id;

    // Attempt to cancel
    const cancelResponse = await makeRequest('PATCH', `/bookings/${bookingId}/cancel`, { 
      reason: 'Testing cancellation notice' 
    }, 'v2');
    
    if (cancelResponse.status === 200) {
      // Cancellation succeeded
      if (expectedToWork) {
        return { 
          success: true, 
          message: 'Cancellation successful' 
        };
      } else {
        return { 
          success: false, 
          message: 'Cancellation succeeded but should have been blocked' 
        };
      }
    } else {
      // Cancellation failed
      if (!expectedToWork) {
        return { 
          success: true, 
          message: `Correctly blocked: ${cancelResponse.data?.message || 'Cancellation notice enforced'}` 
        };
      } else {
        return { 
          success: false, 
          message: `Failed unexpectedly: ${cancelResponse.data?.message || cancelResponse.status}` 
        };
      }
    }
  } catch (error) {
    if (!expectedToWork) {
      return { 
        success: true, 
        message: 'Correctly blocked' 
      };
    }
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Booking Rules Test Suite\n');
  
  // Get current settings
  console.log('Loading current settings...');
  const settingsRes = await makeRequest('GET', '/merchant/settings');
  const settings = settingsRes.data;
  
  const advanceHours = settings?.bookingAdvanceHours || 48;
  const cancellationHours = settings?.cancellationHours || 24;
  
  console.log(`Current Settings:`);
  console.log(`  Advance Booking: ${advanceHours} hours`);
  console.log(`  Cancellation Notice: ${cancellationHours} hours`);
  console.log('');
  
  // Test advance booking hours
  console.log(`${colors.blue}━━━ Testing Advance Booking (${advanceHours}h requirement) ━━━${colors.reset}\n`);
  
  const bookingTests = [
    { hours: 0, expect: false, desc: 'Immediate booking' },
    { hours: 1, expect: false, desc: '1 hour ahead' },
    { hours: advanceHours / 2, expect: false, desc: `${advanceHours/2} hours ahead (half limit)` },
    { hours: advanceHours - 1, expect: false, desc: `${advanceHours-1} hours ahead (just under)` },
    { hours: advanceHours, expect: true, desc: `${advanceHours} hours ahead (exactly at limit)` },
    { hours: advanceHours + 1, expect: true, desc: `${advanceHours+1} hours ahead (just over)` },
    { hours: advanceHours * 2, expect: true, desc: `${advanceHours*2} hours ahead (well over)` },
  ];
  
  for (const test of bookingTests) {
    const timeStr = formatDate(addHours(new Date(), test.hours));
    process.stdout.write(`${test.desc} (${timeStr})... `);
    
    const result = await testBookingCreation(test.hours, test.expect);
    
    if (result.success) {
      console.log(`${colors.green}✅ PASS${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset}`);
    }
    console.log(`   ${result.message}`);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test cancellation notice
  console.log(`\n${colors.blue}━━━ Testing Cancellation Notice (${cancellationHours}h requirement) ━━━${colors.reset}\n`);
  
  const cancellationTests = [
    { hours: 0, expect: false, desc: 'Cancel booking starting now' },
    { hours: 1, expect: false, desc: 'Cancel booking starting in 1h' },
    { hours: cancellationHours / 2, expect: false, desc: `Cancel booking starting in ${cancellationHours/2}h` },
    { hours: cancellationHours - 1, expect: false, desc: `Cancel booking starting in ${cancellationHours-1}h` },
    { hours: cancellationHours, expect: true, desc: `Cancel booking starting in ${cancellationHours}h` },
    { hours: cancellationHours + 1, expect: true, desc: `Cancel booking starting in ${cancellationHours+1}h` },
  ];
  
  for (const test of cancellationTests) {
    const timeStr = formatDate(addHours(new Date(), test.hours));
    process.stdout.write(`${test.desc} (${timeStr})... `);
    
    const result = await testBookingCancellation(test.hours, test.expect);
    
    if (result.success) {
      console.log(`${colors.green}✅ PASS${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset}`);
    }
    console.log(`   ${result.message}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log(`\n${colors.blue}━━━ Test Complete ━━━${colors.reset}\n`);
  console.log('Next Steps:');
  console.log('1. Change settings in UI (e.g., set advance booking to 24h)');
  console.log('2. Run this test again to verify new limits are enforced');
  console.log('3. Check that booking forms in UI also respect these limits');
  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}Test suite error:${colors.reset}`, error.message);
  process.exit(1);
});