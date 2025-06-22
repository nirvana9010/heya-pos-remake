#!/usr/bin/env node

/**
 * Test script to verify auth redirect behavior with expired tokens
 */

const { execSync } = require('child_process');

console.log('🔍 Testing Auth Redirect with Expired Token\n');

// Step 1: Clear all auth data
console.log('1️⃣ Clearing all auth data...');
try {
  // Clear cookies using curl
  execSync(`curl -X GET http://localhost:3002/emergency-logout.html -c /tmp/cookie.jar`, { stdio: 'inherit' });
  console.log('✅ Auth data cleared\n');
} catch (error) {
  console.log('⚠️  Could not clear via emergency logout\n');
}

// Step 2: Test accessing protected route without auth
console.log('2️⃣ Testing access to /calendar without authentication...');
try {
  const response = execSync(`curl -I -L http://localhost:3002/calendar 2>/dev/null | head -20`, { encoding: 'utf8' });
  console.log('Response headers:');
  console.log(response);
  
  if (response.includes('location: /login') || response.includes('Location: /login')) {
    console.log('✅ Successfully redirected to login!\n');
  } else if (response.includes('200 OK')) {
    console.log('❌ ERROR: Protected route returned 200 OK without auth!\n');
  } else {
    console.log('⚠️  Unexpected response\n');
  }
} catch (error) {
  console.log('❌ Error testing redirect:', error.message);
}

// Step 3: Create an expired token and test
console.log('3️⃣ Testing with expired token...');
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

try {
  const response = execSync(`curl -I -L -b "authToken=${expiredToken}" http://localhost:3002/calendar 2>/dev/null | head -20`, { encoding: 'utf8' });
  console.log('Response with expired token:');
  console.log(response);
  
  if (response.includes('location: /login') || response.includes('Location: /login')) {
    console.log('✅ Successfully redirected to login with expired token!\n');
  } else if (response.includes('200 OK')) {
    console.log('❌ ERROR: Protected route returned 200 OK with expired token!\n');
  }
} catch (error) {
  console.log('❌ Error testing with expired token:', error.message);
}

// Step 4: Test client-side behavior
console.log('4️⃣ Testing client-side redirect behavior...');
console.log(`
To test client-side behavior:
1. Open browser in incognito mode
2. Navigate to http://localhost:3002/calendar
3. You should be redirected to /login
4. Check browser console for any errors

If redirect doesn't work:
- Check browser console for errors
- Check Network tab for redirect responses
- Verify no infinite loops occur
`);

console.log('\n✨ Auth redirect test complete!');