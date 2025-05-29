const axios = require('axios');

const MERCHANT_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:3000/api';

async function testMerchantPages() {
  console.log('Testing Merchant App pages...\n');
  
  // First get auth token
  let token = null;
  try {
    const login = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    token = login.data.token;
    console.log('✓ Authentication successful');
  } catch (error) {
    console.error('✗ Authentication failed:', error.message);
    return;
  }
  
  // Test pages
  const pages = [
    { path: '/login', name: 'Login page' },
    { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
    { path: '/services', name: 'Services', requiresAuth: true },
    { path: '/customers', name: 'Customers', requiresAuth: true },
    { path: '/calendar', name: 'Calendar', requiresAuth: true },
    { path: '/bookings', name: 'Bookings', requiresAuth: true },
    { path: '/settings', name: 'Settings', requiresAuth: true }
  ];
  
  for (const page of pages) {
    try {
      const response = await axios.get(`${MERCHANT_URL}${page.path}`, {
        headers: page.requiresAuth ? { Cookie: `token=${token}` } : {},
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        console.log(`✓ ${page.name} - Status: ${response.status}`);
        
        // Check for key elements in response
        if (response.data.includes('Add Service') || response.data.includes('New Service')) {
          console.log('  - Add Service button found');
        }
        if (response.data.includes('data-testid="service-') || response.data.includes('service-item')) {
          console.log('  - Service items found');
        }
        if (response.data.includes('dialog') || response.data.includes('Dialog')) {
          console.log('  - Dialog component found');
        }
      } else {
        console.log(`✗ ${page.name} - Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`✗ ${page.name} - Error:`, error.message);
    }
  }
  
  console.log('\nMerchant pages test completed');
}

testMerchantPages().catch(console.error);