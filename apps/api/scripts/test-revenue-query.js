#!/usr/bin/env node

/**
 * Test revenue aggregation query directly
 */

async function testRevenueQuery() {
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

    // Step 2: Test revenue endpoint directly
    console.log('\nTesting revenue endpoint...');
    const revenueResponse = await fetch('http://localhost:3000/api/v1/reports/revenue', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Response status: ${revenueResponse.status}`);
    
    if (revenueResponse.ok) {
      const revenueData = await revenueResponse.json();
      console.log('\nRevenue data:');
      console.log(JSON.stringify(revenueData, null, 2));
    } else {
      const errorText = await revenueResponse.text();
      console.log('Error response:', errorText);
    }

    // Step 3: Test revenue trend
    console.log('\n\nTesting revenue trend endpoint...');
    const trendResponse = await fetch('http://localhost:3000/api/v1/reports/revenue-trend?days=7', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (trendResponse.ok) {
      const trendData = await trendResponse.json();
      console.log('\nRevenue trend (last 7 days):');
      trendData.forEach(day => {
        if (day.revenue > 0) {
          console.log(`  ${day.date}: $${day.revenue}`);
        }
      });
      
      const totalRevenue = trendData.reduce((sum, day) => sum + day.revenue, 0);
      console.log(`\nTotal revenue (7 days): $${totalRevenue}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRevenueQuery();