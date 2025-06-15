const fetch = require('node-fetch');

async function testEndpoints() {
  console.log('Testing basic endpoints...\n');
  
  const endpoints = [
    { name: 'Health', url: 'http://localhost:3000/api/health' },
    { name: 'Public Services', url: 'http://localhost:3000/api/public/services' },
    { name: 'Public Staff', url: 'http://localhost:3000/api/public/staff' },
    { name: 'Public Merchant Info', url: 'http://localhost:3000/api/public/merchant-info' },
    { name: 'Public Availability', url: 'http://localhost:3000/api/public/availability' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url);
      console.log(`${endpoint.name}: ${response.status} ${response.statusText}`);
      if (response.status !== 200) {
        const text = await response.text();
        console.log('  Response:', text.substring(0, 100));
      }
    } catch (error) {
      console.log(`${endpoint.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\nTesting authenticated endpoints...');
  
  // Login first
  const loginRes = await fetch('http://localhost:3000/api/auth/merchant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'HAMILTON', password: 'demo123' }),
  });
  
  if (loginRes.ok) {
    const { token } = await loginRes.json();
    console.log('Login successful');
    
    const authEndpoints = [
      { name: 'Bookings', url: 'http://localhost:3000/api/bookings' },
      { name: 'Bookings Available Slots', url: 'http://localhost:3000/api/bookings/available-slots?staffId=test&serviceId=test&startDate=2025-06-15&endDate=2025-06-16' },
    ];
    
    for (const endpoint of authEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`${endpoint.name}: ${response.status} ${response.statusText}`);
        if (response.status !== 200) {
          const text = await response.text();
          console.log('  Response:', text.substring(0, 100));
        }
      } catch (error) {
        console.log(`${endpoint.name}: ERROR - ${error.message}`);
      }
    }
  }
}

testEndpoints().catch(console.error);