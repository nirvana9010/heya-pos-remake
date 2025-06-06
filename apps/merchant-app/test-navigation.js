// Quick test to verify main pages are accessible after refactoring
const axios = require('axios');

const pages = [
  '/dashboard',
  '/customers', 
  '/services',
  '/bookings',
  '/calendar',
  '/staff'
];

async function testPages() {
  console.log('Testing page navigation after refactoring...\n');
  
  for (const page of pages) {
    try {
      const start = Date.now();
      const response = await axios.get(`http://localhost:3002${page}`, {
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });
      const duration = Date.now() - start;
      
      // Check if page loads (200 or 401 for auth-protected pages)
      if (response.status === 200 || response.status === 401) {
        console.log(`✅ ${page} - OK (${duration}ms)`);
      } else {
        console.log(`❌ ${page} - Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${page} - Error: ${error.message}`);
    }
  }
}

// Give server time to start
setTimeout(testPages, 2000);