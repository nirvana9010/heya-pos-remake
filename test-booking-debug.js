#!/usr/bin/env node

const axios = require('axios');

async function debugBookingFlow() {
  const API_URL = 'http://localhost:3000/api';
  
  console.log('=== DEBUGGING BOOKING FLOW ===\n');
  
  // Add request interceptor to log what we're sending
  axios.interceptors.request.use(request => {
    if (request.url?.includes('bookings') && request.method === 'post') {
      console.log('\n📤 REQUEST BEING SENT:');
      console.log('URL:', request.url);
      console.log('DATA:', JSON.stringify(request.data, null, 2));
    }
    return request;
  });
  
  // Add response interceptor to log what we receive
  axios.interceptors.response.use(response => {
    if (response.config.url?.includes('bookings') && response.config.method === 'post') {
      console.log('\n📥 RESPONSE RECEIVED:');
      console.log('Status:', response.status);
      console.log('Booking ID:', response.data.id);
      console.log('Provider ID:', response.data.providerId);
      console.log('Provider Name:', response.data.providerName);
      console.log('Staff ID:', response.data.staffId);
      console.log('Staff Name:', response.data.staffName);
    }
    return response;
  });
  
  try {
    // 1. Check merchant setting
    const merchantRes = await axios.get(`${API_URL}/v1/public/merchant-info?subdomain=hamilton`);
    console.log('1. Merchant Settings:');
    console.log('   allowUnassignedBookings:', merchantRes.data.allowUnassignedBookings);
    
    // 2. Get a service and staff
    const servicesRes = await axios.get(`${API_URL}/v1/public/services?subdomain=hamilton`);
    const service = servicesRes.data.data[0];
    
    const staffRes = await axios.get(`${API_URL}/v1/public/staff?subdomain=hamilton`);
    const staff = staffRes.data.data[0];
    
    console.log('\n2. Test Data:');
    console.log('   Service:', service.name, `(${service.id})`);
    console.log('   Staff:', staff.name, `(${staff.id})`);
    
    // 3. Create booking with explicit staffId
    const testDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const testTime = `${10 + Math.floor(Math.random() * 6)}:00`;
    
    console.log('\n3. Creating booking with EXPLICIT staffId...');
    
    const bookingData = {
      customerName: `Debug Test ${Date.now()}`,
      customerEmail: `debug${Date.now()}@example.com`,
      customerPhone: '0400000000',
      services: [{ serviceId: service.id }],
      staffId: staff.id,  // Explicitly setting staffId
      date: testDate,
      startTime: testTime,
      notes: 'Debug test - checking if staffId is processed correctly'
    };
    
    const bookingRes = await axios.post(`${API_URL}/v1/public/bookings?subdomain=hamilton`, bookingData);
    
    console.log('\n4. Database Check:');
    console.log('   If providerId is null, booking will be in Unassigned column');
    console.log('   If providerId has a value, booking will be in staff\'s column');
    
    // Login to check the actual database state
    console.log('\n5. To verify in database:');
    console.log('   - Login to merchant dashboard');
    console.log('   - Check calendar for date:', testDate);
    console.log('   - Look for booking at time:', testTime);
    console.log('   - Should be in', staff.name, 'column, NOT Unassigned');
    
  } catch (error) {
    console.error('\nERROR:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugBookingFlow();