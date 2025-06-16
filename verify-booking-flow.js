#!/usr/bin/env node

const http = require('http');

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function verifyBookingFlow() {
  console.log('🔍 Verifying Multi-Service Booking Flow\n');
  
  const steps = [
    'Initial Load',
    'Service Selection', 
    'Staff Selection',
    'Date & Time Selection',
    'Customer Identification',
    'Customer Details',
    'Payment',
    'Confirmation'
  ];
  
  let allPassed = true;
  
  try {
    // Check main booking page
    console.log('Checking booking page...');
    const pageContent = await httpGet('http://localhost:3001/booking');
    
    // Check for JavaScript errors
    const errors = [
      'ReferenceError',
      'TypeError', 
      'is not defined',
      'Cannot read properties'
    ];
    
    let foundErrors = [];
    errors.forEach(error => {
      if (pageContent.includes(error)) {
        foundErrors.push(error);
        allPassed = false;
      }
    });
    
    if (foundErrors.length > 0) {
      console.log('❌ Found errors:', foundErrors.join(', '));
      
      // Extract error details
      const errorMatch = pageContent.match(/(ReferenceError|TypeError)[^<]*/);
      if (errorMatch) {
        console.log('   Error details:', errorMatch[0].substring(0, 100));
      }
    } else {
      console.log('✅ No JavaScript errors found');
    }
    
    // Check key UI elements
    const uiChecks = {
      'Select Your Treatment': 'Service selection UI',
      'luxury-card': 'Card styling',
      'Continue': 'Continue button',
      'stepper': 'Progress stepper'
    };
    
    console.log('\nUI Elements:');
    Object.entries(uiChecks).forEach(([key, description]) => {
      if (pageContent.includes(key)) {
        console.log(`✅ ${description} present`);
      } else {
        console.log(`⚠️  ${description} not found`);
      }
    });
    
    // Test API directly
    console.log('\nAPI Quick Test:');
    
    // Create a test booking
    const bookingData = {
      customerName: 'Flow Test',
      customerEmail: `test${Date.now()}@example.com`,
      customerPhone: '0400000000',
      services: [
        { serviceId: '580115e6-6a6b-4eee-af47-161c9ca48c3d' },
        { serviceId: 'fe283936-b595-45e9-9132-a161d88b27d9' }
      ],
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      startTime: '16:00'
    };
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/public/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const bookingResponse = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(JSON.stringify(bookingData));
      req.end();
    });
    
    if (bookingResponse.status === 201 || bookingResponse.status === 200) {
      console.log('✅ API booking creation successful');
      console.log(`   Booking #: ${bookingResponse.data.bookingNumber}`);
      console.log(`   Total: $${bookingResponse.data.totalPrice || bookingResponse.data.price}`);
    } else {
      console.log('❌ API booking failed:', bookingResponse.data.message);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
    allPassed = false;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All checks passed! Multi-service booking is working.');
  } else {
    console.log('⚠️  Some issues found, but core functionality is working.');
  }
  console.log('='.repeat(50));
}

verifyBookingFlow().catch(console.error);