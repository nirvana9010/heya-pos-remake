#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const TOKEN = process.env.AUTH_TOKEN || '';

if (!TOKEN) {
  console.error('ERROR: No auth token provided.');
  console.log('Please set AUTH_TOKEN environment variable');
  process.exit(1);
}

// Simple HTTP client
async function makeRequest(method, path, data = null) {
  const url = new URL(API_URL + path);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          };
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to run tests
async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await testFn();
    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`   ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Test functions
async function testLoadSettings() {
  const response = await makeRequest('GET', '/merchant/settings');
  if (!response.data) {
    throw new Error('No settings returned');
  }
  console.log(`   Loaded ${Object.keys(response.data).length} settings`);
}

async function testUpdateBusinessName() {
  const testName = `Test Business ${Date.now()}`;
  await makeRequest('PUT', '/merchant/settings', { businessName: testName });
  
  const response = await makeRequest('GET', '/merchant/settings');
  if (response.data.businessName !== testName) {
    throw new Error(`Business name not updated. Expected: ${testName}, Got: ${response.data.businessName}`);
  }
}

async function testTimezoneUpdate() {
  // Get current timezone
  const current = await makeRequest('GET', '/merchant/settings');
  const originalTimezone = current.data.timezone || 'Australia/Sydney';
  
  // Test update to Perth
  const testTimezone = 'Australia/Perth';
  await makeRequest('PUT', '/merchant/settings', { timezone: testTimezone });
  
  const updated = await makeRequest('GET', '/merchant/settings');
  if (updated.data.timezone !== testTimezone) {
    throw new Error(`Timezone not updated. Expected: ${testTimezone}, Got: ${updated.data.timezone}`);
  }
  
  // Restore original
  await makeRequest('PUT', '/merchant/settings', { timezone: originalTimezone });
}

async function testBookingSettings() {
  const settings = {
    bookingAdvanceHours: 72,
    cancellationHours: 48,
    requireDeposit: true,
    depositPercentage: 25
  };
  
  await makeRequest('PUT', '/merchant/settings', settings);
  
  const updated = await makeRequest('GET', '/merchant/settings');
  
  for (const [key, value] of Object.entries(settings)) {
    if (updated.data[key] !== value) {
      throw new Error(`${key} not updated. Expected: ${value}, Got: ${updated.data[key]}`);
    }
  }
}

async function testSecuritySettings() {
  const settings = {
    requirePinForRefunds: false,
    requirePinForCancellations: false
  };
  
  await makeRequest('PUT', '/merchant/settings', settings);
  
  const updated = await makeRequest('GET', '/merchant/settings');
  
  for (const [key, value] of Object.entries(settings)) {
    if (updated.data[key] !== value) {
      throw new Error(`${key} not updated. Expected: ${value}, Got: ${updated.data[key]}`);
    }
  }
  
  // Reset to secure defaults
  await makeRequest('PUT', '/merchant/settings', {
    requirePinForRefunds: true,
    requirePinForCancellations: true
  });
}

async function testLoyaltySettings() {
  const settings = {
    loyaltyType: 'spend',
    enableTips: true,
    defaultTipPercentages: [10, 15, 20, 25]
  };
  
  await makeRequest('PUT', '/merchant/settings', settings);
  
  const updated = await makeRequest('GET', '/merchant/settings');
  
  if (updated.data.loyaltyType !== settings.loyaltyType) {
    throw new Error(`Loyalty type not updated. Expected: ${settings.loyaltyType}, Got: ${updated.data.loyaltyType}`);
  }
  
  // Reset
  await makeRequest('PUT', '/merchant/settings', {
    loyaltyType: 'visit',
    enableTips: false
  });
}

// Main test runner
async function runAllTests() {
  console.log('\n🧪 Heya POS Settings API Test Suite\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...\n`);
  
  // Run all tests
  await runTest('Load Settings', testLoadSettings);
  await runTest('Update Business Name', testUpdateBusinessName);
  await runTest('Update Timezone', testTimezoneUpdate);
  await runTest('Update Booking Settings', testBookingSettings);
  await runTest('Update Security Settings', testSecuritySettings);
  await runTest('Update Loyalty Settings', testLoyaltySettings);
  
  // Summary
  console.log('\n📊 Test Summary\n');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  // Show current settings
  try {
    const finalSettings = await makeRequest('GET', '/merchant/settings');
    console.log('\n📄 Current Settings:\n');
    console.log(JSON.stringify(finalSettings.data, null, 2));
  } catch (error) {
    console.log('Could not fetch final settings');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error.message);
  process.exit(1);
});