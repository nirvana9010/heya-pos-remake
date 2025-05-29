const http = require('http');

// Test data
const loginData = JSON.stringify({
  username: 'HAMILTON',
  password: 'demo123'
});

// Login request options
const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/merchant/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Testing Heya POS API...\n');

// Test 1: Health Check
console.log('1. Testing Health Endpoint:');
http.get('http://localhost:3000/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Response: ${data}\n`);
    
    // Test 2: Login
    console.log('2. Testing Merchant Login:');
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        const response = JSON.parse(data);
        console.log(`   Response: ${JSON.stringify(response, null, 2)}`);
        
        if (response.token) {
          console.log('\n✅ Login successful!');
          testAuthenticatedEndpoints(response.token);
        } else {
          console.log('\n❌ Login failed');
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`   Error: ${e.message}`);
    });
    
    req.write(loginData);
    req.end();
  });
}).on('error', (e) => {
  console.error(`   Error: ${e.message}`);
});

function testAuthenticatedEndpoints(token) {
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test services endpoint
  console.log('\n3. Testing Services Endpoint:');
  const servicesOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/services',
    headers: authHeaders
  };
  
  http.get(servicesOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      const services = JSON.parse(data);
      console.log(`   Services count: ${services.data ? services.data.length : 0}`);
      if (services.data && services.data.length > 0) {
        console.log(`   First service: ${services.data[0].name}`);
      }
    });
  });
  
  // Test customers endpoint
  console.log('\n4. Testing Customers Endpoint:');
  const customersOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/customers',
    headers: authHeaders
  };
  
  http.get(customersOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      const customers = JSON.parse(data);
      console.log(`   Customers count: ${customers.data ? customers.data.length : 0}`);
    });
  });
  
  // Test bookings calendar
  console.log('\n5. Testing Bookings Calendar:');
  const date = new Date().toISOString().split('T')[0];
  const bookingsOptions = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/bookings/calendar?date=${date}`,
    headers: authHeaders
  };
  
  http.get(bookingsOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      const calendar = JSON.parse(data);
      console.log(`   Bookings count: ${calendar.bookings ? calendar.bookings.length : 0}`);
      console.log(`   Staff count: ${calendar.staff ? calendar.staff.length : 0}`);
    });
  });
}