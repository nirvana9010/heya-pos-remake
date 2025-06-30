const axios = require('axios');

async function checkJwtPayload() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    console.log('🔍 Checking JWT Payload\n');
    
    // Decode JWT (without verification, just to see payload)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('JWT Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\nLogin Response:');
    console.log('- merchantId from response:', loginResponse.data.merchantId);
    console.log('- user.merchantId:', loginResponse.data.user?.merchantId);
    
    console.log('\n📊 Analysis:');
    if (!payload.merchantId) {
      console.log('❌ JWT payload does NOT contain merchantId');
      console.log('This is why WebSocket subscription fails!');
    } else {
      console.log('✅ JWT contains merchantId:', payload.merchantId);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkJwtPayload();