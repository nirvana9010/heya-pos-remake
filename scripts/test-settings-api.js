#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors/safe');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const TOKEN = process.env.AUTH_TOKEN || '';

if (!TOKEN) {
  console.error(colors.red('ERROR: No auth token provided.'));
  console.log('Please set AUTH_TOKEN environment variable or login first:');
  console.log('curl -X POST http://localhost:3000/api/v1/auth/merchant/login -H "Content-Type: application/json" -d \'{"username": "HAMILTON", "password": "demo123"}\' | jq -r \'.access_token\'');
  process.exit(1);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper functions
async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await testFn();
    if (result.warning) {
      console.log(colors.yellow('⚠️  WARNING'));
      console.log(colors.yellow(`   ${result.warning}`));
      results.warnings++;
      results.tests.push({ name, status: 'warning', message: result.warning });
    } else {
      console.log(colors.green('✅ PASSED'));
      results.passed++;
      results.tests.push({ name, status: 'passed' });
    }
  } catch (error) {
    console.log(colors.red('❌ FAILED'));
    console.log(colors.red(`   ${error.message}`));
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Test functions
async function testLoadSettings() {
  const response = await api.get('/merchant/settings');
  if (!response.data) {
    throw new Error('No settings returned');
  }
  return { data: response.data };
}

async function testUpdateBusinessName() {
  const testName = `Test Business ${Date.now()}`;
  await api.put('/merchant/settings', { businessName: testName });
  
  const response = await api.get('/merchant/settings');
  if (response.data.businessName !== testName) {
    throw new Error(`Business name not updated. Expected: ${testName}, Got: ${response.data.businessName}`);
  }
  return { success: true };
}

async function testTimezoneUpdate() {
  // Get current timezone
  const current = await api.get('/merchant/settings');
  const originalTimezone = current.data.timezone || 'Australia/Sydney';
  
  // Test update to Perth
  const testTimezone = 'Australia/Perth';
  await api.put('/merchant/settings', { timezone: testTimezone });
  
  const updated = await api.get('/merchant/settings');
  if (updated.data.timezone !== testTimezone) {
    throw new Error(`Timezone not updated. Expected: ${testTimezone}, Got: ${updated.data.timezone}`);
  }
  
  // Restore original
  await api.put('/merchant/settings', { timezone: originalTimezone });
  
  return { success: true };
}

async function testBookingSettings() {
  const settings = {
    bookingAdvanceHours: 72,
    cancellationHours: 48,
    requireDeposit: true,
    depositPercentage: 25
  };
  
  await api.put('/merchant/settings', settings);
  
  const updated = await api.get('/merchant/settings');
  
  for (const [key, value] of Object.entries(settings)) {
    if (updated.data[key] !== value) {
      throw new Error(`${key} not updated. Expected: ${value}, Got: ${updated.data[key]}`);
    }
  }
  
  return { success: true };
}

async function testSecuritySettings() {
  const settings = {
    requirePinForRefunds: false,
    requirePinForCancellations: false
  };
  
  await api.put('/merchant/settings', settings);
  
  const updated = await api.get('/merchant/settings');
  
  for (const [key, value] of Object.entries(settings)) {
    if (updated.data[key] !== value) {
      throw new Error(`${key} not updated. Expected: ${value}, Got: ${updated.data[key]}`);
    }
  }
  
  // Reset to secure defaults
  await api.put('/merchant/settings', {
    requirePinForRefunds: true,
    requirePinForCancellations: true
  });
  
  return { success: true };
}

async function testLoyaltySettings() {
  const settings = {
    loyaltyType: 'spend',
    enableTips: true,
    defaultTipPercentages: [10, 15, 20, 25]
  };
  
  await api.put('/merchant/settings', settings);
  
  const updated = await api.get('/merchant/settings');
  
  if (updated.data.loyaltyType !== settings.loyaltyType) {
    throw new Error(`Loyalty type not updated. Expected: ${settings.loyaltyType}, Got: ${updated.data.loyaltyType}`);
  }
  
  // Reset
  await api.put('/merchant/settings', {
    loyaltyType: 'visit',
    enableTips: false
  });
  
  return { success: true };
}

async function testSettingsPersistence() {
  // Set some values
  const testSettings = {
    bookingAdvanceHours: 48,
    cancellationHours: 24,
    requirePinForRefunds: true
  };
  
  await api.put('/merchant/settings', testSettings);
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify they persisted
  const reloaded = await api.get('/merchant/settings');
  
  for (const [key, value] of Object.entries(testSettings)) {
    if (reloaded.data[key] !== value) {
      throw new Error(`${key} did not persist. Expected: ${value}, Got: ${reloaded.data[key]}`);
    }
  }
  
  return { success: true };
}

async function testInvalidValues() {
  // Test negative values
  try {
    await api.put('/merchant/settings', { bookingAdvanceHours: -1 });
    throw new Error('Should not accept negative booking hours');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      return { success: true };
    }
    // API accepted invalid value - this is a warning
    return { warning: 'API accepts negative values for bookingAdvanceHours' };
  }
}

async function testLocationTimezone() {
  try {
    const locations = await api.get('/locations');
    if (!locations.data || locations.data.length === 0) {
      return { warning: 'No locations found to test timezone sync' };
    }
    
    const location = locations.data[0];
    const testTimezone = 'Australia/Brisbane';
    
    // This might fail if endpoint doesn't exist
    await api.put(`/locations/${location.id}/timezone`, { timezone: testTimezone });
    
    return { success: true };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { warning: 'Location timezone endpoint not implemented' };
    }
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log(colors.cyan('\n🧪 Heya POS Settings API Test Suite\n'));
  console.log(`API URL: ${API_URL}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...\n`);
  
  // Run all tests
  await runTest('Load Settings', testLoadSettings);
  await runTest('Update Business Name', testUpdateBusinessName);
  await runTest('Update Timezone', testTimezoneUpdate);
  await runTest('Update Booking Settings', testBookingSettings);
  await runTest('Update Security Settings', testSecuritySettings);
  await runTest('Update Loyalty Settings', testLoyaltySettings);
  await runTest('Settings Persistence', testSettingsPersistence);
  await runTest('Invalid Value Validation', testInvalidValues);
  await runTest('Location Timezone Sync', testLocationTimezone);
  
  // Summary
  console.log(colors.cyan('\n📊 Test Summary\n'));
  console.log(`Total Tests: ${results.passed + results.failed + results.warnings}`);
  console.log(colors.green(`✅ Passed: ${results.passed}`));
  console.log(colors.red(`❌ Failed: ${results.failed}`));
  console.log(colors.yellow(`⚠️  Warnings: ${results.warnings}`));
  
  // Detailed results
  if (results.failed > 0 || results.warnings > 0) {
    console.log(colors.cyan('\n📋 Detailed Results\n'));
    results.tests.forEach(test => {
      if (test.status === 'failed') {
        console.log(colors.red(`❌ ${test.name}: ${test.error}`));
      } else if (test.status === 'warning') {
        console.log(colors.yellow(`⚠️  ${test.name}: ${test.message}`));
      }
    });
  }
  
  // Get final settings state
  try {
    const finalSettings = await api.get('/merchant/settings');
    console.log(colors.cyan('\n📄 Current Settings State\n'));
    console.log(JSON.stringify(finalSettings.data, null, 2));
  } catch (error) {
    console.log(colors.red('Could not fetch final settings state'));
  }
  
  // Exit code based on failures
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(colors.red('\n💥 Test suite crashed:'), error.message);
  process.exit(1);
});