const fetch = require('node-fetch');

async function debugAPI() {
  // Login first
  const loginRes = await fetch('http://localhost:3000/api/auth/merchant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'HAMILTON', password: 'demo123' })
  });
  
  const { token } = await loginRes.json();
  
  // Check staff endpoint
  console.log('Staff endpoint response:');
  const staffRes = await fetch('http://localhost:3000/api/staff', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const staffData = await staffRes.json();
  console.log('Type:', typeof staffData);
  console.log('Is Array:', Array.isArray(staffData));
  console.log('Sample:', JSON.stringify(staffData).substring(0, 200));
  
  // Find test staff
  const testStaff = staffData.find(s => s.firstName === 'Test' || s.email?.includes('test'));
  console.log('\nTest staff found:', testStaff ? `${testStaff.firstName} ${testStaff.lastName}` : 'None');
  
  console.log('\nServices endpoint response:');
  const servicesRes = await fetch('http://localhost:3000/api/services', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const servicesData = await servicesRes.json();
  console.log('Type:', typeof servicesData);
  console.log('Keys:', Object.keys(servicesData));
  console.log('Sample:', JSON.stringify(servicesData).substring(0, 200));
  
  // Find test service
  const testService = servicesData.data?.find(s => s.name.includes('Test'));
  console.log('\nTest service found:', testService ? testService.name : 'None');
}

debugAPI().catch(console.error);