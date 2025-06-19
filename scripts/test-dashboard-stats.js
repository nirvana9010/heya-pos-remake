#!/usr/bin/env node

/**
 * Test dashboard stats endpoint
 */

async function testDashboardStats() {
  try {
    // Step 1: Login
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:3000/api/v1/auth/merchant/login', {
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
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful');

    // Step 2: Test dashboard stats endpoint
    console.log('\nTesting dashboard stats endpoint...');
    const statsResponse = await fetch('http://localhost:3000/api/v1/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${statsResponse.status}`);
    
    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.log('Error response:', errorText);
      
      // Try reports endpoint instead
      console.log('\nTrying reports overview endpoint...');
      const reportsResponse = await fetch('http://localhost:3000/api/v1/reports/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (reportsResponse.ok) {
        const data = await reportsResponse.json();
        console.log('\nReports overview data includes:');
        console.log('- Revenue:', data.revenue);
        console.log('- Revenue Growth:', data.revenueGrowth);
        console.log('- Bookings:', data.bookings);
        console.log('- Booking Growth:', data.bookingGrowth);
        console.log('- Customers:', data.customers);
        console.log('- Customer Growth:', data.customerGrowth);
      }
    } else {
      const statsData = await statsResponse.json();
      console.log('\nDashboard stats:');
      console.log(JSON.stringify(statsData, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDashboardStats();