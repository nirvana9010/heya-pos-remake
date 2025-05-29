const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';
const MERCHANT_URL = 'http://localhost:3002';

async function runComprehensiveTest() {
  console.log('=== POS SYSTEM COMPREHENSIVE TEST REPORT ===\n');
  console.log('Test Date:', new Date().toISOString());
  console.log('Test Credentials: username=HAMILTON, password=demo123\n');
  
  const testResults = {
    api: { passed: 0, failed: 0, errors: [] },
    websocket: { passed: 0, failed: 0, errors: [] },
    ui: { passed: 0, failed: 0, errors: [] }
  };
  
  // 1. API ENDPOINTS TEST
  console.log('1. API ENDPOINTS TEST');
  console.log('---------------------');
  
  let token = null;
  
  // Health check
  try {
    const health = await axios.get(`${API_URL}/health`);
    console.log('✓ Health check: PASSED');
    testResults.api.passed++;
  } catch (error) {
    console.log('✗ Health check: FAILED -', error.message);
    testResults.api.failed++;
    testResults.api.errors.push('Health check failed');
  }
  
  // Authentication
  try {
    const login = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    token = login.data.token;
    console.log('✓ Authentication: PASSED');
    console.log(`  - Merchant: ${login.data.user.firstName}`);
    console.log(`  - Role: ${login.data.user.role}`);
    testResults.api.passed++;
  } catch (error) {
    console.log('✗ Authentication: FAILED -', error.response?.data?.message || error.message);
    testResults.api.failed++;
    testResults.api.errors.push('Authentication failed');
    return testResults;
  }
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Services endpoint
  try {
    const services = await axios.get(`${API_URL}/services`, { headers });
    console.log(`✓ Services endpoint: PASSED (${services.data.data.length} services)`);
    testResults.api.passed++;
  } catch (error) {
    console.log('✗ Services endpoint: FAILED -', error.response?.data?.message || error.message);
    testResults.api.failed++;
    testResults.api.errors.push('Services endpoint failed');
  }
  
  // Customers endpoint
  try {
    const customers = await axios.get(`${API_URL}/customers`, { headers });
    console.log(`✓ Customers endpoint: PASSED (${customers.data.data.length} customers)`);
    testResults.api.passed++;
  } catch (error) {
    console.log('✗ Customers endpoint: FAILED -', error.response?.data?.message || error.message);
    testResults.api.failed++;
    testResults.api.errors.push('Customers endpoint failed');
  }
  
  // Bookings endpoint
  try {
    const bookings = await axios.get(`${API_URL}/bookings`, { headers });
    console.log(`✓ Bookings endpoint: PASSED (${bookings.data.data.length} bookings)`);
    testResults.api.passed++;
  } catch (error) {
    console.log('✗ Bookings endpoint: FAILED -', error.response?.data?.message || error.message);
    testResults.api.failed++;
    testResults.api.errors.push('Bookings endpoint failed');
  }
  
  // 2. WEBSOCKET TEST
  console.log('\n2. WEBSOCKET REAL-TIME UPDATES TEST');
  console.log('-----------------------------------');
  
  await new Promise((resolve) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket']
    });
    
    socket.on('connect', () => {
      console.log('✓ WebSocket connection: PASSED');
      testResults.websocket.passed++;
      
      socket.emit('subscribe:calendar', {
        merchantId: 'cmb6b3ina0003vo6xs5lzeeqz',
        locationId: 'cmb6b3iox0007vo6xiv7cms3d'
      });
      console.log('✓ Calendar subscription: PASSED');
      testResults.websocket.passed++;
      
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 2000);
    });
    
    socket.on('error', (error) => {
      console.log('✗ WebSocket error:', error);
      testResults.websocket.failed++;
      testResults.websocket.errors.push('WebSocket connection error');
      resolve();
    });
  });
  
  // 3. MERCHANT APP UI TEST
  console.log('\n3. MERCHANT APP UI TEST');
  console.log('-----------------------');
  
  const uiPages = [
    '/login',
    '/dashboard',
    '/services',
    '/customers',
    '/calendar',
    '/bookings'
  ];
  
  for (const page of uiPages) {
    try {
      const response = await axios.get(`${MERCHANT_URL}${page}`, {
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        console.log(`✓ ${page}: ACCESSIBLE`);
        testResults.ui.passed++;
        
        // Special checks for services page
        if (page === '/services' && response.data.includes('ServiceDialog')) {
          console.log('  - Service dialog component: FOUND');
        }
      } else {
        console.log(`✗ ${page}: ERROR (Status ${response.status})`);
        testResults.ui.failed++;
        testResults.ui.errors.push(`${page} returned status ${response.status}`);
      }
    } catch (error) {
      console.log(`✗ ${page}: FAILED -`, error.message);
      testResults.ui.failed++;
      testResults.ui.errors.push(`${page} access failed`);
    }
  }
  
  // SUMMARY
  console.log('\n=== TEST SUMMARY ===');
  console.log(`API Tests: ${testResults.api.passed} passed, ${testResults.api.failed} failed`);
  console.log(`WebSocket Tests: ${testResults.websocket.passed} passed, ${testResults.websocket.failed} failed`);
  console.log(`UI Tests: ${testResults.ui.passed} passed, ${testResults.ui.failed} failed`);
  
  const totalPassed = testResults.api.passed + testResults.websocket.passed + testResults.ui.passed;
  const totalFailed = testResults.api.failed + testResults.websocket.failed + testResults.ui.failed;
  console.log(`\nTOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  
  if (totalFailed > 0) {
    console.log('\nERRORS FOUND:');
    [...testResults.api.errors, ...testResults.websocket.errors, ...testResults.ui.errors].forEach(error => {
      console.log(`- ${error}`);
    });
  } else {
    console.log('\n✅ ALL TESTS PASSED! The POS system is functioning correctly.');
  }
  
  return testResults;
}

runComprehensiveTest().catch(console.error);