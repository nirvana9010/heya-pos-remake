const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function checkRevenueEndpoint() {
  try {
    // Login
    console.log('Logging in...');
    const loginResponse = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Logged in successfully\n');
    
    // Check revenue endpoint
    console.log('Calling revenue endpoint...');
    const revenueResponse = await axios.get(`${API_URL}/v1/reports/revenue`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Revenue Response:', JSON.stringify(revenueResponse.data, null, 2));
    
    // Check if there are any payments in the system
    console.log('\nChecking for existing payments...');
    
    // Try to get an existing completed order
    const ordersResponse = await axios.get(`${API_URL}/v1/payments/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(err => {
      console.log('Orders endpoint not available or errored');
      return null;
    });
    
    if (ordersResponse && ordersResponse.data) {
      console.log('Found orders:', ordersResponse.data.length || 0);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack trace:');
      console.error(error.response.data.stack);
    }
  }
}

checkRevenueEndpoint();