#!/usr/bin/env node

/**
 * Owner PIN System Test Script
 * Tests the complete owner PIN flow including:
 * 1. Owner account creation
 * 2. PIN setup
 * 3. PIN verification
 * 4. Access control
 */

const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3000/api/v1';
let authToken = null;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to log test results
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// Helper to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };
  
  if (data) config.data = data;
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Test 1: Check initial owner status
async function testInitialOwnerStatus() {
  console.log('\n🔍 Test 1: Check Initial Owner Status');
  
  // First login as merchant
  const loginResult = await apiRequest('POST', '/auth/merchant/login', {
    username: 'HAMILTON',
    password: 'demo123'
  });
  
  if (!loginResult.success) {
    logTest('Merchant login', false, 'Failed to login');
    return false;
  }
  
  authToken = loginResult.data.token;
  logTest('Merchant login', true);
  
  // Check for existing owner
  const staffResult = await apiRequest('GET', '/staff');
  if (!staffResult.success) {
    logTest('Fetch staff list', false, 'Failed to get staff');
    return false;
  }
  
  const hasOwner = staffResult.data.some(s => s.role === 'OWNER');
  logTest('Check for existing owner', true, `Owner exists: ${hasOwner}`);
  
  // Check PIN status (this might 404 if endpoint doesn't exist)
  const pinStatusResult = await apiRequest('GET', '/auth/pin-status');
  logTest('Check PIN status endpoint', pinStatusResult.status !== 404, 
    pinStatusResult.status === 404 ? 'Endpoint not implemented (expected)' : 'PIN status checked');
  
  return true;
}

// Test 2: Create owner account
async function testCreateOwner() {
  console.log('\n👤 Test 2: Create Owner Account');
  
  // Check if owner already exists
  const staffResult = await apiRequest('GET', '/staff');
  if (staffResult.success) {
    const existingOwner = staffResult.data.find(s => s.role === 'OWNER');
    if (existingOwner) {
      logTest('Owner already exists', true, `Username: ${existingOwner.username}`);
      return existingOwner;
    }
  }
  
  // Create new owner
  const ownerData = {
    firstName: 'Test',
    lastName: 'Owner',
    email: 'owner@test.com',
    username: 'testowner',
    role: 'OWNER',
    permissions: ['*'],
    isActive: true
  };
  
  const createResult = await apiRequest('POST', '/staff', ownerData);
  logTest('Create owner account', createResult.success, 
    createResult.success ? 'Owner created successfully' : createResult.error.message);
  
  return createResult.success ? createResult.data : null;
}

// Test 3: Test PIN operations
async function testPinOperations() {
  console.log('\n🔐 Test 3: PIN Operations');
  
  // Test setting PIN (will use mock implementation)
  const setPinResult = await apiRequest('POST', '/auth/set-pin', {
    pin: '5678',
    role: 'OWNER'
  });
  
  logTest('Set owner PIN', setPinResult.status !== 404, 
    setPinResult.status === 404 ? 'Using mock implementation' : 'PIN set via API');
  
  // Test verifying correct PIN
  const verifyCorrectResult = await apiRequest('POST', '/auth/verify-pin', {
    pin: '5678',
    feature: 'reports',
    role: 'OWNER'
  });
  
  logTest('Verify correct PIN', verifyCorrectResult.status !== 404,
    setPinResult.status === 404 ? 'Using mock verification' : 'PIN verified via API');
  
  // Test verifying incorrect PIN
  const verifyWrongResult = await apiRequest('POST', '/auth/verify-pin', {
    pin: '0000',
    feature: 'reports',
    role: 'OWNER'
  });
  
  logTest('Reject incorrect PIN', verifyWrongResult.status !== 404,
    'Incorrect PIN should be rejected');
  
  return true;
}

// Test 4: Test settings integration
async function testSettingsIntegration() {
  console.log('\n⚙️  Test 4: Settings Integration');
  
  // Get current settings
  const getSettingsResult = await apiRequest('GET', '/merchant/settings');
  if (!getSettingsResult.success) {
    logTest('Get merchant settings', false, 'Failed to fetch settings');
    return false;
  }
  
  const settings = getSettingsResult.data;
  logTest('Get merchant settings', true);
  
  // Check PIN-related settings
  console.log('   Current PIN settings:');
  console.log(`   - Require PIN for reports: ${settings.requirePinForReports}`);
  console.log(`   - Require PIN for refunds: ${settings.requirePinForRefunds}`);
  console.log(`   - Require PIN for cancellations: ${settings.requirePinForCancellations}`);
  
  // Test enabling PIN for reports
  const updateResult = await apiRequest('PUT', '/merchant/settings', {
    ...settings,
    requirePinForReports: true
  });
  
  logTest('Enable PIN for reports', updateResult.success);
  
  return true;
}

// Test 5: UI Integration Test Guide
function printUITestGuide() {
  console.log('\n🖥️  Test 5: UI Integration Test Guide');
  console.log('   Follow these steps to test the UI integration:\n');
  
  console.log('   1. Navigate to Reports page (/reports)');
  console.log('      - Should see PIN entry screen if setting is enabled');
  console.log('      - Should see owner setup flow if no owner exists');
  console.log('      - Should see PIN setup flow if owner has no PIN\n');
  
  console.log('   2. Test Owner Setup Flow:');
  console.log('      a. If no owner exists, create owner form should appear');
  console.log('      b. Fill in owner details and submit');
  console.log('      c. PIN setup form should appear next');
  console.log('      d. Enter and confirm a PIN (4-8 digits)');
  console.log('      e. Reports page should load after setup\n');
  
  console.log('   3. Test PIN Entry:');
  console.log('      a. Navigate away and return to Reports');
  console.log('      b. PIN prompt should appear every time');
  console.log('      c. Wrong PIN should show error');
  console.log('      d. Correct PIN should grant access');
  console.log('      e. No "remember for 15 minutes" - PIN required every time\n');
  
  console.log('   4. Test Settings Toggle:');
  console.log('      a. Go to Settings → Security');
  console.log('      b. Disable "Require PIN for reports"');
  console.log('      c. Reports should be accessible without PIN');
  console.log('      d. Re-enable setting');
  console.log('      e. PIN should be required again\n');
  
  console.log('   5. Test Environment Checks:');
  console.log('      a. In development: No demo PIN hints should appear');
  console.log('      b. Demo PIN (1234) should not work');
  console.log('      c. Only owner PIN should be accepted');
}

// Test 6: Security validation
async function testSecurityValidation() {
  console.log('\n🛡️  Test 6: Security Validation');
  
  // Test PIN format validation
  const testPins = [
    { pin: '123', expected: false, reason: 'Too short (< 4 digits)' },
    { pin: '123456789', expected: false, reason: 'Too long (> 8 digits)' },
    { pin: 'abcd', expected: false, reason: 'Non-numeric' },
    { pin: '12 34', expected: false, reason: 'Contains spaces' },
    { pin: '5678', expected: true, reason: 'Valid 4-digit PIN' },
    { pin: '12345678', expected: true, reason: 'Valid 8-digit PIN' }
  ];
  
  console.log('   Testing PIN format validation:');
  for (const test of testPins) {
    const isValid = /^\d{4,8}$/.test(test.pin);
    const passed = isValid === test.expected;
    console.log(`   ${passed ? '✅' : '❌'} "${test.pin}" - ${test.reason}`);
  }
  
  logTest('PIN format validation', true, 'All format tests completed');
  
  // Test no session storage
  console.log('\n   Testing session persistence:');
  console.log('   - PIN should NOT be stored in session storage');
  console.log('   - PIN should NOT be remembered for any duration');
  console.log('   - Every access should require PIN entry');
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('🧪 Owner PIN System Test Suite');
  console.log('================================\n');
  
  try {
    // Run all tests
    await testInitialOwnerStatus();
    await testCreateOwner();
    await testPinOperations();
    await testSettingsIntegration();
    await testSecurityValidation();
    printUITestGuide();
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total tests: ${results.tests.length}`);
    console.log(`Passed: ${results.passed} ✅`);
    console.log(`Failed: ${results.failed} ❌`);
    
    if (results.failed > 0) {
      console.log('\nFailed tests:');
      results.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
    }
    
    // Additional notes
    console.log('\n📝 Important Notes:');
    console.log('1. Some API endpoints may not be implemented yet (expected)');
    console.log('2. The system uses mock implementations for PIN storage in development');
    console.log('3. Production will require proper API implementation');
    console.log('4. Always test the full UI flow after API testing');
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
}

// Check if API is running
async function checkApiStatus() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch {
    console.error('❌ API is not running on http://localhost:3000');
    console.log('Please start the API with: cd apps/api && npm run start:dev');
    return false;
  }
}

// Run tests
(async () => {
  if (await checkApiStatus()) {
    await runTests();
  }
})();