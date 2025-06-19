#!/usr/bin/env node

/**
 * Test reports overview endpoint
 */

async function testReportsOverview() {
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

    // Step 2: Test overview endpoint
    console.log('\nTesting reports overview endpoint...');
    const overviewResponse = await fetch('http://localhost:3000/api/v1/reports/overview', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${overviewResponse.status}`);
    
    if (overviewResponse.ok) {
      const overviewData = await overviewResponse.json();
      console.log('\nOverview data structure:');
      
      // Check if it's the old nested structure or new flat structure
      if (overviewData.revenue?.revenue) {
        console.log('❌ Still using OLD nested structure (revenue.revenue.monthly)');
      } else if (overviewData.revenue?.monthly !== undefined) {
        console.log('✅ Using NEW flat structure (revenue.monthly)');
      }
      
      console.log('\nTop-level keys:');
      Object.keys(overviewData).forEach(key => {
        console.log(`  - ${key}: ${typeof overviewData[key]}`);
      });
      
      // Show revenue data
      if (overviewData.revenue) {
        console.log('\nRevenue data:');
        console.log(JSON.stringify(overviewData.revenue, null, 2));
      }
      
      // Show revenue growth
      if (overviewData.revenueGrowth) {
        console.log('\nRevenue growth:');
        console.log(JSON.stringify(overviewData.revenueGrowth, null, 2));
      }
    } else {
      const errorText = await overviewResponse.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReportsOverview();