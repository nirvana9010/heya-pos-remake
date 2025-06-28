#!/usr/bin/env node

const axios = require('axios');

async function testCompleteBookingFlow() {
  const API_URL = 'http://localhost:3000/api';
  
  console.log('=== COMPLETE BOOKING FLOW TEST ===\n');
  
  try {
    // 1. Login to get auth token
    console.log('1. Logging in as merchant...');
    const loginRes = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    const token = loginRes.data.access_token;
    console.log('   ✓ Logged in successfully');
    
    // 2. Check merchant setting
    console.log('\n2. Checking merchant settings...');
    const merchantRes = await axios.get(`${API_URL}/v1/public/merchant-info?subdomain=hamilton`);
    console.log('   allowUnassignedBookings:', merchantRes.data.allowUnassignedBookings);
    
    // 3. Get test data
    const servicesRes = await axios.get(`${API_URL}/v1/public/services?subdomain=hamilton`);
    const service = servicesRes.data.data[0];
    
    const staffRes = await axios.get(`${API_URL}/v1/public/staff?subdomain=hamilton`);
    const staff = staffRes.data.data.find(s => s.name !== 'Unassigned') || staffRes.data.data[0];
    
    console.log('\n3. Using test data:');
    console.log('   Service:', service.name, `(${service.id})`);
    console.log('   Staff:', staff.name, `(${staff.id})`);
    
    // 4. Create booking via public API
    const testDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const testTime = `${9 + Math.floor(Math.random() * 8)}:00`;
    
    console.log('\n4. Creating booking via public API...');
    const bookingData = {
      customerName: `Flow Test ${Date.now()}`,
      customerEmail: `flowtest${Date.now()}@example.com`,
      customerPhone: '0400000000',
      services: [{ serviceId: service.id }],
      staffId: staff.id,
      date: testDate,
      startTime: testTime,
      notes: 'Complete flow test'
    };
    
    console.log('   Request data:', JSON.stringify(bookingData, null, 2));
    
    const createRes = await axios.post(`${API_URL}/v1/public/bookings?subdomain=hamilton`, bookingData);
    const createdBooking = createRes.data;
    
    console.log('\n   Response:');
    console.log('   - Booking ID:', createdBooking.id);
    console.log('   - Staff ID:', createdBooking.staffId);
    console.log('   - Staff Name:', createdBooking.staffName);
    console.log('   - Provider ID:', createdBooking.providerId || 'Not in response');
    
    // 5. Fetch the booking via merchant API (V2)
    console.log('\n5. Fetching booking via merchant API (V2)...');
    const fetchRes = await axios.get(`${API_URL}/v2/bookings/${createdBooking.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const fetchedBooking = fetchRes.data;
    console.log('   V2 Response:');
    console.log('   - ID:', fetchedBooking.id);
    console.log('   - Staff ID:', fetchedBooking.staffId);
    console.log('   - Staff Name:', fetchedBooking.staffName);
    console.log('   - Provider ID:', fetchedBooking.providerId || 'Not in response');
    
    // 6. Fetch bookings list for the date (how calendar fetches)
    console.log('\n6. Fetching bookings list (as calendar does)...');
    const listRes = await axios.get(`${API_URL}/v2/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate: `${testDate}T00:00:00.000Z`,
        endDate: `${testDate}T23:59:59.999Z`,
        limit: 100
      }
    });
    
    const bookingInList = listRes.data.data.find(b => b.id === createdBooking.id);
    if (bookingInList) {
      console.log('   Found booking in list:');
      console.log('   - Staff ID:', bookingInList.staffId);
      console.log('   - Staff Name:', bookingInList.staffName);
      console.log('   - Should appear in:', bookingInList.staffId ? `${bookingInList.staffName} column` : 'Unassigned column');
    } else {
      console.log('   ❌ Booking not found in list!');
    }
    
    // 7. Summary
    console.log('\n=== SUMMARY ===');
    console.log('Merchant allows unassigned bookings:', merchantRes.data.allowUnassignedBookings);
    console.log('Staff ID was provided:', staff.id);
    console.log('Booking should appear in:', bookingInList?.staffId ? `${bookingInList.staffName} column` : 'Unassigned column');
    
    if (bookingInList?.staffId === staff.id) {
      console.log('\n✅ SUCCESS: Booking correctly assigned to staff member');
    } else {
      console.log('\n❌ ISSUE: Booking not correctly assigned');
      console.log('Expected staffId:', staff.id);
      console.log('Actual staffId:', bookingInList?.staffId || 'null');
    }
    
  } catch (error) {
    console.error('\nERROR:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompleteBookingFlow();