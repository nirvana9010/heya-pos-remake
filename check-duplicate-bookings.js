#!/usr/bin/env node

const axios = require('axios');

async function checkDuplicateBookings() {
  const API_URL = 'http://localhost:3000/api';
  
  console.log('=== CHECKING FOR DUPLICATE BOOKINGS ===\n');
  
  try {
    // Login to get auth token
    const loginRes = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    const token = loginRes.data.access_token;
    
    // Get today's bookings
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const startDate = today.toISOString();
    const endDate = tomorrow.toISOString();
    
    console.log('Fetching bookings for date range:', {
      startDate: startDate.split('T')[0],
      endDate: endDate.split('T')[0]
    });
    
    const response = await axios.get(`${API_URL}/v2/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate,
        endDate,
        limit: 100
      }
    });
    
    const bookings = response.data.data || [];
    console.log(`\nFound ${bookings.length} total bookings\n`);
    
    // Group bookings by ID to check for duplicates
    const bookingsByID = {};
    bookings.forEach(booking => {
      if (!bookingsByID[booking.id]) {
        bookingsByID[booking.id] = [];
      }
      bookingsByID[booking.id].push(booking);
    });
    
    // Check for duplicates
    let duplicatesFound = false;
    Object.entries(bookingsByID).forEach(([id, instances]) => {
      if (instances.length > 1) {
        duplicatesFound = true;
        console.log(`⚠️  DUPLICATE FOUND - Booking ID: ${id}`);
        console.log(`   Appears ${instances.length} times in the response`);
        instances.forEach((booking, i) => {
          console.log(`   Instance ${i + 1}:`, {
            staffId: booking.staffId,
            staffName: booking.staffName,
            customerName: booking.customerName,
            time: booking.startTime
          });
        });
      }
    });
    
    if (!duplicatesFound) {
      console.log('✅ No duplicate booking IDs found\n');
    }
    
    // Check for bookings with null staffId (unassigned)
    const unassignedBookings = bookings.filter(b => !b.staffId || b.staffId === null);
    console.log(`\n📊 Unassigned bookings: ${unassignedBookings.length}`);
    
    if (unassignedBookings.length > 0) {
      console.log('\nUnassigned booking details:');
      unassignedBookings.forEach(booking => {
        console.log(`- ${booking.customerName} at ${new Date(booking.startTime).toLocaleTimeString()}`);
        console.log(`  ID: ${booking.id}`);
        console.log(`  StaffID: ${booking.staffId}`);
        console.log(`  StaffName: ${booking.staffName}`);
      });
    }
    
    // Check if any bookings have both staffId and appear unassigned
    const bookingsWithStaffButUnassigned = bookings.filter(b => 
      b.staffId && b.staffName === 'Unassigned'
    );
    
    if (bookingsWithStaffButUnassigned.length > 0) {
      console.log('\n⚠️  ANOMALY: Bookings with staffId but showing as Unassigned:');
      bookingsWithStaffButUnassigned.forEach(booking => {
        console.log(`- ${booking.customerName}`);
        console.log(`  ID: ${booking.id}`);
        console.log(`  StaffID: ${booking.staffId}`);
        console.log(`  StaffName: ${booking.staffName}`);
      });
    }
    
  } catch (error) {
    console.error('\nERROR:', error.response?.data?.message || error.message);
  }
}

checkDuplicateBookings();