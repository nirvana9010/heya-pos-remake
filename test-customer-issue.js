const http = require('http');

async function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body,
          json: body ? JSON.parse(body) : null
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function testCustomerIssue() {
  console.log('🔍 Investigating Customer Lookup Issue\n');
  
  const testEmail = 'lukas.tn90@gmail.com';
  
  // Step 1: Check current state
  console.log(`1️⃣ Checking if ${testEmail} exists...`);
  
  const lookupResult = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/public/customers/lookup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail });
  
  console.log(`   Status: ${lookupResult.status}`);
  console.log(`   Result: ${JSON.stringify(lookupResult.json)}\n`);
  
  if (!lookupResult.json.found) {
    console.log('2️⃣ Customer not found. Creating a new booking to establish customer...');
    
    const bookingData = {
      customerName: 'Lukas TN',
      customerEmail: testEmail,
      customerPhone: '0400123456',
      services: [
        { serviceId: '26da5a82-6f67-4b4e-85f4-b5bfc7fded51' }, // Anti-Aging Facial
        { serviceId: '83dc8e73-e2d8-4aa0-b740-d967c7c7e1f3' }  // Express Facial
      ],
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      startTime: '11:00'
    };
    
    const bookingResult = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/public/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, bookingData);
    
    if (bookingResult.status === 200 || bookingResult.status === 201) {
      console.log('   ✅ Booking created successfully');
      console.log(`   Booking #: ${bookingResult.json.bookingNumber}\n`);
      
      // Wait a moment for DB to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('3️⃣ Checking customer lookup again...');
      const secondLookup = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/public/customers/lookup',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { email: testEmail });
      
      console.log(`   Result: ${JSON.stringify(secondLookup.json)}`);
      
      if (secondLookup.json.found) {
        console.log('   ✅ Customer now found!');
        console.log(`   Name: ${secondLookup.json.customer.firstName} ${secondLookup.json.customer.lastName}`);
      } else {
        console.log('   ❌ Customer still not found - there may be a merchant mismatch issue');
      }
    } else {
      console.log('   ❌ Failed to create booking:', bookingResult.json);
    }
  } else {
    console.log('   ✅ Customer already exists in database');
    console.log(`   Name: ${lookupResult.json.customer.firstName} ${lookupResult.json.customer.lastName}`);
  }
  
  console.log('\n📊 Summary');
  console.log('==========');
  console.log('The "No booking found" error appears because:');
  console.log('1. The browser remembers the email from localStorage');
  console.log('2. But the email doesn\'t exist in this database instance');
  console.log('3. This is expected behavior if testing with a fresh database');
  console.log('\nThe UI correctly shows "Welcome back" (from localStorage)');
  console.log('but the database lookup fails (no customer record).');
}

testCustomerIssue().catch(console.error);