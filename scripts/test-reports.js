#!/usr/bin/env node

/**
 * Test reports API endpoint
 */

async function testReports() {
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

    // Step 2: Test reports endpoint
    console.log('\nFetching reports overview...');
    const reportsResponse = await fetch('http://localhost:3000/api/v1/reports/overview', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${reportsResponse.status}`);
    
    const responseText = await reportsResponse.text();
    console.log('Response body:', responseText);

    if (reportsResponse.ok) {
      try {
        const reportsData = JSON.parse(responseText);
        console.log('\n✓ Reports data structure:');
        // Show only the top-level keys to see the structure
        console.log('Top-level keys:', Object.keys(reportsData));
        console.log('\nRevenue structure:', reportsData.revenue);
        console.log('\nBookings structure:', reportsData.bookings);
        console.log('\nCustomers structure:', reportsData.customers);
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReports();