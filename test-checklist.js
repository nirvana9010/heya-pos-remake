const axios = require('axios');

// Test configuration
const MERCHANT_APP = 'http://localhost:3002';
const API_URL = 'http://localhost:3000/api';
const BOOKING_APP = 'http://localhost:3001';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// Test functions
async function testAPIHealth() {
  try {
    const response = await axios.get(`${API_URL}/v1/health`);
    const passed = response.status === 200 && response.data.status === 'ok';
    logTest('API Health Check', passed, `Status: ${response.status}`);
  } catch (error) {
    logTest('API Health Check', false, error.message);
  }
}

async function testMerchantLogin() {
  try {
    const response = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    const passed = response.status === 200 && response.data.access_token;
    logTest('Merchant Login', passed, passed ? 'Token received' : 'No token');
    return response.data.access_token;
  } catch (error) {
    logTest('Merchant Login', false, error.response?.data?.message || error.message);
    return null;
  }
}

async function testAuthenticatedEndpoint(token) {
  if (!token) {
    logTest('Authenticated Endpoint Test', false, 'No token available');
    return;
  }
  
  try {
    const response = await axios.get(`${API_URL}/v1/merchant/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const passed = response.status === 200;
    logTest('Authenticated Endpoint Access', passed);
  } catch (error) {
    logTest('Authenticated Endpoint Access', false, error.response?.status || error.message);
  }
}

async function testCustomersList(token) {
  if (!token) {
    logTest('Customers List', false, 'No token available');
    return;
  }
  
  try {
    const response = await axios.get(`${API_URL}/v1/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const passed = response.status === 200 && Array.isArray(response.data);
    logTest('Customers List', passed, `Found ${response.data.length || 0} customers`);
  } catch (error) {
    logTest('Customers List', false, error.response?.status || error.message);
  }
}

async function testServicesList(token) {
  if (!token) {
    logTest('Services List', false, 'No token available');
    return;
  }
  
  try {
    const response = await axios.get(`${API_URL}/v1/services`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const passed = response.status === 200 && Array.isArray(response.data);
    logTest('Services List', passed, `Found ${response.data.length || 0} services`);
  } catch (error) {
    logTest('Services List', false, error.response?.status || error.message);
  }
}

async function testBookingsList(token) {
  if (!token) {
    logTest('Bookings List', false, 'No token available');
    return;
  }
  
  try {
    const response = await axios.get(`${API_URL}/v2/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const passed = response.status === 200;
    logTest('Bookings List (v2)', passed);
  } catch (error) {
    logTest('Bookings List (v2)', false, error.response?.status || error.message);
  }
}

async function testMerchantAppPages() {
  const pages = [
    { name: 'Login Page', url: '/login' },
    { name: 'Calendar Page', url: '/calendar' },
    { name: 'Customers Page', url: '/customers' },
    { name: 'Services Page', url: '/services' },
    { name: 'Settings Page', url: '/settings' }
  ];
  
  console.log('\nTesting Merchant App Pages...');
  
  for (const page of pages) {
    try {
      const response = await axios.get(`${MERCHANT_APP}${page.url}`, {
        maxRedirects: 0,
        validateStatus: (status) => status < 400
      });
      const passed = response.status === 200 || response.status === 302;
      logTest(`Merchant App - ${page.name}`, passed, `Status: ${response.status}`);
    } catch (error) {
      logTest(`Merchant App - ${page.name}`, false, error.message);
    }
  }
}

async function testBookingApp() {
  try {
    const response = await axios.get(`${BOOKING_APP}/hamilton`);
    const passed = response.status === 200;
    logTest('Booking App - Hamilton Page', passed);
  } catch (error) {
    logTest('Booking App - Hamilton Page', false, error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Running Heya POS Test Checklist...\n');
  
  console.log('Testing API Endpoints...');
  await testAPIHealth();
  
  const token = await testMerchantLogin();
  await testAuthenticatedEndpoint(token);
  await testCustomersList(token);
  await testServicesList(token);
  await testBookingsList(token);
  
  await testMerchantAppPages();
  
  console.log('\nTesting Booking App...');
  await testBookingApp();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.tests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  // Detailed failures
  if (results.failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`- ${test.name}: ${test.details}`);
    });
  }
}

// Run the tests
runTests().catch(console.error);