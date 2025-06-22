const axios = require('axios');

async function testAuthRedirect() {
  console.log('Testing auth redirect behavior...\n');
  
  // Test 1: Access protected route without token
  console.log('1. Testing access to /calendar without auth token:');
  try {
    const response = await axios.get('http://localhost:3002/calendar', {
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    console.log('   ❌ FAIL: Should have redirected to login');
  } catch (error) {
    if (error.response && error.response.status === 302) {
      console.log('   ✅ PASS: Redirected as expected');
      console.log('   Location:', error.response.headers.location);
    } else {
      console.log('   ❌ FAIL: Unexpected error:', error.message);
    }
  }
  
  // Test 2: Access protected route with expired token
  console.log('\n2. Testing access to /calendar with expired token:');
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwibWVyY2hhbnRJZCI6InRlc3QiLCJ0eXBlIjoibWVyY2hhbnQiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.test';
  
  try {
    const response = await axios.get('http://localhost:3002/calendar', {
      headers: {
        Cookie: `authToken=${expiredToken}`
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    console.log('   ❌ FAIL: Should have redirected to login');
  } catch (error) {
    if (error.response && error.response.status === 302) {
      console.log('   ✅ PASS: Redirected as expected');
      console.log('   Location:', error.response.headers.location);
    } else {
      console.log('   ❌ FAIL: Unexpected error:', error.message);
    }
  }
  
  // Test 3: Access login page with valid token (should redirect to calendar)
  console.log('\n3. Testing access to /login with valid token:');
  const validToken = process.env.DEV_MERCHANT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZDUzMTA1Mi1hYzkyLTQ3MWQtOGRmZS03NzM5MTlkZjY5NGIiLCJtZXJjaGFudElkIjoiZTQzYWRkOWUtN2Q2Zi00YTIzLWE1NDYtMGFhZmI0YTc5YThjIiwidHlwZSI6Im1lcmNoYW50IiwiaWF0IjoxNzUwMTA3OTg0LCJleHAiOjE3ODE2NDM5ODR9.s0EJmVCWNWNGabIyvEtrUir_QMmv0IuEqWrGBEuVC6s';
  
  try {
    const response = await axios.get('http://localhost:3002/login', {
      headers: {
        Cookie: `authToken=${validToken}`
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    console.log('   ❌ FAIL: Should have redirected to calendar');
  } catch (error) {
    if (error.response && error.response.status === 302) {
      console.log('   ✅ PASS: Redirected as expected');
      console.log('   Location:', error.response.headers.location);
    } else {
      console.log('   ❌ FAIL: Unexpected error:', error.message);
    }
  }
  
  console.log('\n✅ Auth redirect testing complete!');
}

testAuthRedirect().catch(console.error);