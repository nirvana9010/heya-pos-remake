#!/usr/bin/env node

const axios = require('axios');

async function testAutoRefresh() {
  const API_URL = 'http://localhost:3000/api';
  
  console.log('=== TESTING CALENDAR AUTO-REFRESH ===\n');
  console.log('Instructions:');
  console.log('1. Open the merchant calendar in your browser');
  console.log('2. This script will create a booking in 5 seconds');
  console.log('3. The calendar should auto-refresh within 10 seconds and show the booking\n');
  
  // Wait for user to open calendar
  console.log('Waiting 5 seconds for you to open the calendar...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // Get test data
    const servicesRes = await axios.get(`${API_URL}/v1/public/services?subdomain=hamilton`);
    const service = servicesRes.data.data[0];
    
    const staffRes = await axios.get(`${API_URL}/v1/public/staff?subdomain=hamilton`);
    const staff = staffRes.data.data[0];
    
    // Create booking for tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const testDate = tomorrow.toISOString().split('T')[0];
    const testTime = '14:00';
    
    console.log('\nCreating test booking...');
    console.log(`Date: ${testDate}`);
    console.log(`Time: ${testTime}`);
    console.log(`Staff: ${staff.name}`);
    console.log(`Service: ${service.name}`);
    
    const bookingData = {
      customerName: `Auto Refresh Test ${Date.now()}`,
      customerEmail: `autorefresh${Date.now()}@test.com`,
      customerPhone: '0400000000',
      services: [{ serviceId: service.id }],
      staffId: staff.id,
      date: testDate,
      startTime: testTime,
      notes: 'Testing auto-refresh feature'
    };
    
    const response = await axios.post(`${API_URL}/v1/public/bookings?subdomain=hamilton`, bookingData);
    
    console.log('\n✅ Booking created successfully!');
    console.log('Booking ID:', response.data.id);
    console.log('Staff assigned:', response.data.staffName);
    
    console.log('\n⏱️  Now watch the calendar...');
    console.log('The booking should appear in the', response.data.staffName, 'column within 10 seconds.');
    console.log('You should see "Updating..." appear briefly when it refreshes.');
    
    // Keep script alive for 15 seconds to observe
    console.log('\nWaiting 15 seconds for auto-refresh to occur...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('\n✅ Test complete!');
    console.log('If the booking appeared automatically, auto-refresh is working.');
    console.log('If not, there may be an issue with the implementation.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);
  }
}

testAutoRefresh();