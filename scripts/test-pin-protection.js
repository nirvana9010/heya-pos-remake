#!/usr/bin/env node

const http = require('http');

// Test PIN protection for reports
async function testPinProtection(token) {
  console.log('\n🔐 Testing PIN Protection for Reports\n');
  
  // 1. Check current setting
  console.log('1. Checking current PIN setting...');
  try {
    const settingsRes = await makeRequest('GET', '/merchant/settings', null, token);
    console.log(`   requirePinForReports: ${settingsRes.requirePinForReports}`);
    
    // 2. Enable PIN for reports
    console.log('\n2. Enabling PIN for reports...');
    await makeRequest('PUT', '/merchant/settings', { requirePinForReports: true }, token);
    console.log('   ✅ Enabled');
    
    // 3. Verify it's enabled
    const verifyRes = await makeRequest('GET', '/merchant/settings', null, token);
    console.log(`   Verified: requirePinForReports = ${verifyRes.requirePinForReports}`);
    
    console.log('\n3. Test Instructions:');
    console.log('   a) Navigate to Reports page');
    console.log('   b) You should see a PIN entry screen');
    console.log('   c) Enter PIN: 1234');
    console.log('   d) Reports should load');
    console.log('   e) Navigate away and come back');
    console.log('   f) PIN should be required again (no session storage)');
    
    // 4. Test disabling
    console.log('\n4. Disabling PIN for reports...');
    await makeRequest('PUT', '/merchant/settings', { requirePinForReports: false }, token);
    console.log('   ✅ Disabled');
    
    console.log('\n5. Test Instructions:');
    console.log('   a) Navigate to Reports page');
    console.log('   b) Reports should load directly (no PIN screen)');
    
    // 5. Re-enable for security
    console.log('\n6. Re-enabling PIN for security...');
    await makeRequest('PUT', '/merchant/settings', { requirePinForReports: true }, token);
    console.log('   ✅ Re-enabled');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Helper function
async function makeRequest(method, path, data, token) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1${path}`,
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
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

// Get token from environment or command line
const token = process.env.AUTH_TOKEN || process.argv[2];

if (!token) {
  console.error('Please provide auth token:');
  console.error('AUTH_TOKEN=your_token node test-pin-protection.js');
  console.error('or');
  console.error('node test-pin-protection.js your_token');
  process.exit(1);
}

// Run test
testPinProtection(token);