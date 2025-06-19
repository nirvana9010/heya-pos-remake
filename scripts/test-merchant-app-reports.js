#!/usr/bin/env node

/**
 * Test merchant app reports page functionality
 */

async function testMerchantAppReports() {
  try {
    // First login to merchant app
    console.log('Logging in to merchant app...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'HAMILTON',
        password: 'demo123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status);
      const text = await loginResponse.text();
      console.log('Response:', text);
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✓ Login successful');

    // Now fetch the reports page data (simulate what the page does)
    console.log('\nFetching reports data...');
    const reportsResponse = await fetch('http://localhost:3002/api/reports/overview', {
      headers: {
        'Cookie': cookies || ''
      }
    });

    console.log(`Response status: ${reportsResponse.status}`);
    
    if (reportsResponse.ok) {
      const data = await reportsResponse.json();
      
      console.log('\nReports data received:');
      console.log('- Revenue:', data.revenue);
      console.log('- Revenue Growth:', data.revenueGrowth);
      console.log('- Bookings:', data.bookings);
      console.log('- Customers:', data.customers);
      console.log('- Avg Booking Value:', data.avgBookingValue);
      
      // Check if it's the correct structure
      if (data.revenue?.revenue) {
        console.log('\n❌ ERROR: Still using nested structure!');
      } else if (data.revenue?.monthly !== undefined) {
        console.log('\n✅ SUCCESS: Using flat structure!');
      }
    } else {
      const errorText = await reportsResponse.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMerchantAppReports();