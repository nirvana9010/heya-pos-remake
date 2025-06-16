// Debug script to test customer lookup flow

const http = require('http');

async function testCustomerFlow() {
  console.log('🔍 Debugging Customer Lookup Flow\n');
  
  // Step 1: Check if test customer exists
  console.log('1️⃣ Checking if test@example.com exists...');
  
  const lookupData = JSON.stringify({ email: 'test@example.com' });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/public/customers/lookup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': lookupData.length
    }
  };
  
  const response = await new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}\n`);
        resolve(JSON.parse(data));
      });
    });
    
    req.write(lookupData);
    req.end();
  });
  
  if (response.found) {
    console.log('✅ Customer found:');
    console.log(`   Name: ${response.customer.firstName} ${response.customer.lastName}`);
    console.log(`   Email: ${response.customer.email}`);
    console.log(`   Phone: ${response.customer.phone}`);
  } else {
    console.log('❌ Customer not found');
  }
  
  // Step 2: Check the booking page state
  console.log('\n2️⃣ Checking booking page for errors...');
  
  const pageReq = http.get('http://localhost:3001/booking', (res) => {
    let pageData = '';
    res.on('data', chunk => pageData += chunk);
    res.on('end', () => {
      if (pageData.includes('ReferenceError') || pageData.includes('TypeError')) {
        console.log('❌ Found JavaScript errors in page');
      } else {
        console.log('✅ No JavaScript errors found');
      }
      
      // Check if CustomerIdentification component is present
      if (pageData.includes('CustomerIdentification')) {
        console.log('✅ CustomerIdentification component found in page');
      }
      
      // Check for the error message
      if (pageData.includes('No booking found with this information')) {
        console.log('⚠️  Error message is present in initial page load!');
        console.log('   This suggests the error might be shown by default');
      }
    });
  });
  
  console.log('\n3️⃣ Testing with non-existent email...');
  
  const nonExistentData = JSON.stringify({ email: 'doesnotexist@example.com' });
  
  const nonExistentReq = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const result = JSON.parse(data);
      console.log(`Response for non-existent: ${JSON.stringify(result)}`);
      if (!result.found) {
        console.log('✅ Correctly returns found: false for non-existent customer');
      }
    });
  });
  
  nonExistentReq.write(nonExistentData);
  nonExistentReq.end();
}

testCustomerFlow().catch(console.error);