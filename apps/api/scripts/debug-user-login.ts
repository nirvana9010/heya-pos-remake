import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function debugUserLogin() {
  try {
    console.log('Testing login to see user data...');
    const loginResponse = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    // Decode JWT token to see user info
    const token = loginResponse.data.token;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('\nJWT payload:', JSON.stringify(payload, null, 2));
    
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugUserLogin();