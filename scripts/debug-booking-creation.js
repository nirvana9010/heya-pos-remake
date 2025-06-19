#!/usr/bin/env node

const fetch = require('node-fetch');

async function debugBookingCreation() {
  console.log('=== Debug Booking Creation ===\n');

  try {
    // Step 1: Login
    const loginResponse = await fetch('http://localhost:3000/api/v1/auth/merchant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HAMILTON',
        password: 'demo123'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Get required data
    const [servicesResponse, customersResponse, staffResponse, locationsResponse] = await Promise.all([
      fetch('http://localhost:3000/api/v1/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/v1/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/v1/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/v1/locations', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    const servicesData = await servicesResponse.json();
    const customersData = await customersResponse.json();
    const staffData = await staffResponse.json();
    const locationsData = await locationsResponse.json();
    
    console.log('Raw data structures:');
    console.log('  Services:', Object.keys(servicesData));
    console.log('  Customers:', Object.keys(customersData));
    console.log('  Staff:', Object.keys(staffData));
    console.log('  Locations:', Object.keys(locationsData));
    
    const service = servicesData.data?.[0] || servicesData[0];
    const customer = customersData.data?.[0] || customersData[0];
    const staff = staffData.data?.[0] || staffData[0];
    const location = locationsData.data?.[0] || locationsData[0];
    
    if (!service || !customer || !staff || !location) {
      console.log('Missing data:');
      console.log('  Service available:', !!service);
      console.log('  Customer available:', !!customer);
      console.log('  Staff available:', !!staff);
      console.log('  Location available:', !!location);
      return;
    }

    console.log('Data retrieved:');
    console.log('  Service:', service.id, '-', service.name);
    console.log('  Customer:', customer.id, '-', customer.firstName, customer.lastName);
    console.log('  Staff:', staff.id, '-', staff.firstName, staff.lastName);
    console.log('  Location:', location.id, '-', location.name);

    // Step 3: Create exact DTO format
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 10);

    // Try both formats to see which one works
    const bookingDto1 = {
      customerId: customer.id,
      staffId: staff.id,
      locationId: location.id,
      serviceId: service.id, // Single service
      startTime: startTime.toISOString(),
      notes: 'Debug test booking'
    };
    
    const bookingDto2 = {
      customerId: customer.id,
      staffId: staff.id,
      locationId: location.id,
      startTime: startTime.toISOString(),
      services: [{
        serviceId: service.id,
        staffId: staff.id,
        price: parseFloat(service.price),
        duration: service.duration
      }],
      notes: 'Debug test booking'
    };

    console.log('\n📋 Trying format 1 (single serviceId):');
    console.log(JSON.stringify(bookingDto1, null, 2));

    // Step 4: Test the booking creation
    console.log('\n📅 Creating booking...');
    const bookingResponse = await fetch('http://localhost:3000/api/v2/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingDto1)
    });

    console.log('Response status:', bookingResponse.status);
    
    if (!bookingResponse.ok) {
      const errorText = await bookingResponse.text();
      console.log('Error response:', errorText);
      
      // Try to parse as JSON for better formatting
      try {
        const errorJson = JSON.parse(errorText);
        console.log('\n📝 Validation errors:');
        if (errorJson.message && Array.isArray(errorJson.message)) {
          errorJson.message.forEach(msg => console.log('  -', msg));
        }
      } catch (e) {
        // Not JSON, just display as text
      }
    } else {
      const bookingData = await bookingResponse.json();
      console.log('✅ Booking created successfully!');
      console.log('Booking ID:', bookingData.id);
      console.log('Status:', bookingData.status);
      console.log('Start time:', bookingData.startTime);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugBookingCreation();