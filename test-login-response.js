const axios = require('axios');

async function testLogin() {
  console.log('Testing login response structure...\n');

  try {
    const response = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    console.log('Login Response Structure:');
    console.log('Has token:', !!response.data.token);
    console.log('Has refreshToken:', !!response.data.refreshToken);
    console.log('Has user:', !!response.data.user);
    console.log('Has merchant:', !!response.data.merchant);
    console.log('Has merchantId:', !!response.data.merchantId);
    
    console.log('\nUser object:', JSON.stringify(response.data.user, null, 2));
    console.log('\nMerchant data:', response.data.merchant);
    console.log('\nMerchantId:', response.data.merchantId);
    
    // Decode token
    const token = response.data.token;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('\nToken payload:', JSON.stringify(payload, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();