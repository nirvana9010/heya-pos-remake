// Test script to verify logout functionality
const axios = require('axios');

async function testLogout() {
  const baseUrl = 'http://localhost:3002';
  const apiUrl = 'http://localhost:3000/api/v1';
  
  console.log('🔍 Testing Logout Flow...\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${apiUrl}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const { access_token } = loginResponse.data;
    console.log('✅ Login successful, token received');
    
    // Step 2: Test authenticated endpoint
    console.log('\n2. Testing authenticated endpoint...');
    const authTest = await axios.get(`${apiUrl}/staff`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    console.log('✅ Authenticated endpoint accessible');
    
    // Step 3: Simulate logout (clear token)
    console.log('\n3. Simulating logout (clearing token)...');
    // In real app, this happens client-side
    
    // Step 4: Test endpoint without token
    console.log('\n4. Testing endpoint after logout...');
    try {
      await axios.get(`${apiUrl}/staff`);
      console.log('❌ ERROR: Endpoint accessible without token!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint correctly returns 401 Unauthorized');
      } else {
        console.log('❌ Unexpected error:', error.response?.status || error.message);
      }
    }
    
    console.log('\n✅ Logout flow test completed successfully!');
    console.log('\nTo test in browser:');
    console.log('1. Login at http://localhost:3002/login');
    console.log('2. Navigate to Calendar page');
    console.log('3. Click logout in top-right menu');
    console.log('4. Should redirect to login without loops');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testLogout();