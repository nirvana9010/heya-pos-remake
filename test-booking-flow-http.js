#!/usr/bin/env node

const http = require('http');
const https = require('https');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    step: `${colors.yellow}→${colors.reset}`
  };
  
  console.log(`${prefix[type] || ''} ${message}`);
}

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          };
          
          // Try to parse JSON
          try {
            result.json = JSON.parse(body);
          } catch (e) {
            // Not JSON, that's ok
          }
          
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testBookingFlow() {
  console.log('🚀 Testing Multi-Service Booking Flow\n');
  
  try {
    // Test 1: Load booking page
    log('Testing booking page load...', 'step');
    const pageResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/booking',
      method: 'GET'
    });
    
    if (pageResponse.statusCode === 200) {
      log('Booking page loaded successfully', 'success');
      
      // Check for JavaScript errors
      if (pageResponse.body.includes('ReferenceError')) {
        log('Found ReferenceError in page!', 'error');
      } else {
        log('No JavaScript errors detected', 'success');
      }
      
      // Check for key elements
      if (pageResponse.body.includes('Select Your Treatment')) {
        log('Service selection UI present', 'success');
      }
    } else {
      log(`Booking page returned status ${pageResponse.statusCode}`, 'error');
    }
    
    console.log('');
    
    // Test 2: Get services from API
    log('Fetching available services...', 'step');
    const servicesResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/public/services',
      method: 'GET'
    });
    
    if (servicesResponse.json && servicesResponse.json.data) {
      const services = servicesResponse.json.data;
      log(`Found ${services.length} services`, 'success');
      
      // Find our test services
      const facial = services.find(s => s.name === 'Classic Facial');
      const massage = services.find(s => s.name === 'Swedish Massage');
      
      if (facial && massage) {
        log(`Classic Facial: ${facial.duration}min - $${facial.price}`, 'info');
        log(`Swedish Massage: ${massage.duration}min - $${massage.price}`, 'info');
        
        console.log('');
        
        // Test 3: Check availability for multiple services
        log('Checking availability for multiple services...', 'step');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        const availabilityResponse = await makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/v1/public/bookings/check-availability',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }, {
          date: dateStr,
          services: [
            { serviceId: facial.id },
            { serviceId: massage.id }
          ]
        });
        
        if (availabilityResponse.json && availabilityResponse.json.slots) {
          const slots = availabilityResponse.json.slots;
          const availableSlots = slots.filter(s => s.available);
          log(`Found ${availableSlots.length} available time slots`, 'success');
          log(`Total duration for both services: ${facial.duration + massage.duration} minutes`, 'info');
          
          console.log('');
          
          // Test 4: Create multi-service booking
          log('Creating multi-service booking...', 'step');
          
          const bookingData = {
            customerName: 'Test User',
            customerEmail: `test${Date.now()}@example.com`,
            customerPhone: '0412345678',
            services: [
              { serviceId: facial.id },
              { serviceId: massage.id }
            ],
            date: dateStr,
            startTime: availableSlots[0].time,
            notes: 'E2E test booking'
          };
          
          const bookingResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/public/bookings',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }, bookingData);
          
          if (bookingResponse.json && bookingResponse.json.id) {
            log('Booking created successfully!', 'success');
            log(`Booking ID: ${bookingResponse.json.id}`, 'info');
            log(`Booking Number: ${bookingResponse.json.bookingNumber}`, 'info');
            
            // Check if response includes service details
            if (bookingResponse.json.services && bookingResponse.json.services.length === 2) {
              log('Both services included in booking ✓', 'success');
              log(`Total Price: $${bookingResponse.json.totalPrice || bookingResponse.json.price}`, 'info');
            } else if (bookingResponse.json.totalPrice || bookingResponse.json.price) {
              log(`Total Price: $${bookingResponse.json.totalPrice || bookingResponse.json.price}`, 'info');
            }
            
            console.log('');
            
            // Test 5: Verify booking details
            log('Verifying booking details...', 'step');
            const detailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/public/bookings/${bookingResponse.json.id}`,
              method: 'GET'
            });
            
            if (detailsResponse.json) {
              log('Booking details retrieved successfully', 'success');
              log(`Status: ${detailsResponse.json.status}`, 'info');
              log(`Duration: ${detailsResponse.json.duration} minutes`, 'info');
            }
          } else {
            log('Failed to create booking', 'error');
            console.error(bookingResponse.body);
          }
          
        } else {
          log('Failed to get availability', 'error');
        }
        
      } else {
        log('Could not find test services', 'error');
      }
    } else {
      log('Failed to fetch services', 'error');
    }
    
    console.log('\n✅ Testing complete!');
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run the test
testBookingFlow();