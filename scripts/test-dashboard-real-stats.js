#!/usr/bin/env node

/**
 * Test that dashboard stats are calculated from real data
 */

async function testDashboardRealStats() {
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

    // Step 2: Get reports overview (source of truth)
    console.log('\nFetching reports overview data...');
    const reportsResponse = await fetch('http://localhost:3000/api/v1/reports/overview', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (reportsResponse.ok) {
      const data = await reportsResponse.json();
      
      console.log('\nReal data from reports overview:');
      console.log('=====================================');
      
      console.log('\nRevenue:');
      console.log(`- Daily (Today): $${data.revenue.daily}`);
      console.log(`- Weekly: $${data.revenue.weekly}`);
      console.log(`- Monthly: $${data.revenue.monthly}`);
      
      console.log('\nRevenue Growth:');
      console.log(`- Daily: ${data.revenueGrowth.daily}%`);
      console.log(`- Weekly: ${data.revenueGrowth.weekly}%`);
      console.log(`- Monthly: ${data.revenueGrowth.monthly}%`);
      
      console.log('\nBookings:');
      console.log(`- Total: ${data.bookings.total}`);
      console.log(`- Pending: ${data.bookings.pending}`);
      console.log(`- Completed: ${data.bookings.completed}`);
      
      console.log('\nBooking Growth:');
      console.log(`- Daily: ${data.bookingGrowth.daily}%`);
      console.log(`- Weekly: ${data.bookingGrowth.weekly}%`);
      console.log(`- Monthly: ${data.bookingGrowth.monthly}%`);
      
      console.log('\nCustomers:');
      console.log(`- Total: ${data.customers.total}`);
      console.log(`- New: ${data.customers.new}`);
      console.log(`- Customer Growth: ${data.customerGrowth}%`);
      
      console.log('\n=====================================');
      console.log('\nDashboard should show:');
      console.log(`- Today's Bookings: ${data.bookings.total} (${data.bookingGrowth.daily >= 0 ? '+' : ''}${data.bookingGrowth.daily}%)`);
      console.log(`- Today's Revenue: $${data.revenue.daily} (${data.revenueGrowth.daily >= 0 ? '+' : ''}${data.revenueGrowth.daily}%)`);
      console.log(`- New Customers: ${data.customers.new} (${data.customerGrowth >= 0 ? '+' : ''}${data.customerGrowth}%)`);
      console.log(`- Pending Bookings: ${data.bookings.pending} (${data.bookings.pending} waiting)`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDashboardRealStats();