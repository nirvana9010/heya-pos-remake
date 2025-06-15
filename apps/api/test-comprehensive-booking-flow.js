const fetch = require('node-fetch');

// Test data
const merchantCreds = { username: 'HAMILTON', password: 'demo123' };
const testCustomer = {
  email: 'test.customer@example.com',
  phoneCode: '+61',
  phoneNumber: '412345678',
  firstName: 'Test',
  lastName: 'Customer'
};

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `http://localhost:3000/api${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  
  return { 
    status: response.status, 
    statusText: response.statusText,
    data,
    ok: response.ok
  };
}

async function runTests() {
  console.log('🧪 COMPREHENSIVE BOOKING FLOW TEST\n');
  
  let token, staffId, serviceId, bookingId, orderId;
  
  // Test 1: Public endpoints
  console.log('1️⃣ Testing Public Endpoints\n');
  
  // Get merchant info
  const merchantInfo = await apiCall('/public/merchant-info');
  console.log(`✓ Merchant Info: ${merchantInfo.status} - ${merchantInfo.data?.name || 'No name'}`);
  
  // Get services
  const services = await apiCall('/public/services');
  console.log(`✓ Services: ${services.status} - Found ${services.data?.data?.length || 0} services`);
  if (services.ok && services.data?.data?.length > 0) {
    serviceId = services.data.data[0].id;
    console.log(`  Using service: ${services.data.data[0].name} (${serviceId})`);
  }
  
  // Get staff
  const staff = await apiCall('/public/staff');
  console.log(`✓ Staff: ${staff.status} - Found ${staff.data?.data?.length || 0} staff members`);
  if (staff.ok && staff.data?.data?.length > 0) {
    staffId = staff.data.data[0].id;
    console.log(`  Using staff: ${staff.data.data[0].name} (${staffId})`);
  }
  
  // Test availability endpoint
  if (staffId && serviceId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    
    const availability = await apiCall(`/public/availability?staffId=${staffId}&serviceId=${serviceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    console.log(`✓ Availability: ${availability.status} - Found ${availability.data?.availableSlots?.length || 0} slots`);
    
    if (availability.data?.availableSlots?.length > 0) {
      console.log(`  First available slot: ${availability.data.availableSlots[0].startTime}`);
    }
  }
  
  console.log('\n2️⃣ Testing Customer Booking Flow\n');
  
  // Look up customer
  const customerLookup = await apiCall('/public/customers/lookup', {
    method: 'POST',
    body: JSON.stringify({ 
      email: testCustomer.email,
      phoneCode: testCustomer.phoneCode,
      phoneNumber: testCustomer.phoneNumber
    })
  });
  console.log(`✓ Customer Lookup: ${customerLookup.status}`);
  
  // Create booking from customer app
  if (staffId && serviceId) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(10, 0, 0, 0);
    
    const bookingData = {
      customer: testCustomer,
      providerId: staffId,
      services: [serviceId],
      startTime: startTime.toISOString(),
      notes: 'Test booking from comprehensive test'
    };
    
    const createBooking = await apiCall('/public/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
    console.log(`✓ Create Booking: ${createBooking.status}`);
    
    if (createBooking.ok) {
      bookingId = createBooking.data.id;
      console.log(`  Booking ID: ${bookingId}`);
      console.log(`  Status: ${createBooking.data.status}`);
    } else {
      console.log(`  Error: ${JSON.stringify(createBooking.data)}`);
    }
  }
  
  console.log('\n3️⃣ Testing Merchant Authentication\n');
  
  // Login as merchant
  const login = await apiCall('/auth/merchant/login', {
    method: 'POST',
    body: JSON.stringify(merchantCreds)
  });
  console.log(`✓ Merchant Login: ${login.status}`);
  
  if (login.ok) {
    token = login.data.token;
    console.log(`  Token received: ${token.substring(0, 20)}...`);
  }
  
  console.log('\n4️⃣ Testing Merchant Booking Management\n');
  
  // Get bookings
  const bookings = await apiCall('/bookings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`✓ Get Bookings: ${bookings.status} - Found ${bookings.data?.bookings?.length || 0} bookings`);
  
  // Test available slots endpoint
  if (staffId && serviceId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    
    const availableSlots = await apiCall(`/bookings/available-slots?staffId=${staffId}&serviceId=${serviceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✓ Available Slots (Merchant): ${availableSlots.status}`);
    
    if (availableSlots.ok) {
      console.log(`  Available: ${availableSlots.data?.availableSlots?.filter(s => s.available).length || 0} slots`);
      console.log(`  Conflicted: ${availableSlots.data?.availableSlots?.filter(s => !s.available).length || 0} slots`);
    }
  }
  
  // Test create with check (double booking prevention)
  if (staffId && serviceId) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(10, 0, 0, 0); // Same time as customer booking to test conflict
    
    const conflictBooking = {
      customer: {
        email: 'conflict.test@example.com',
        phoneCode: '+61',
        phoneNumber: '498765432',
        firstName: 'Conflict',
        lastName: 'Test'
      },
      providerId: staffId,
      services: [serviceId],
      startTime: startTime.toISOString(),
      notes: 'Testing double booking prevention'
    };
    
    const createWithCheck = await apiCall('/bookings/create-with-check', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(conflictBooking)
    });
    console.log(`✓ Create with Check: ${createWithCheck.status}`);
    
    if (!createWithCheck.ok && createWithCheck.data?.requiresOverride) {
      console.log(`  Conflict detected! Requires override`);
      console.log(`  Conflicts: ${createWithCheck.data.conflicts?.length || 0}`);
      
      // Try with override
      const overrideBooking = {
        ...conflictBooking,
        forceOverride: true,
        overrideReason: 'Customer specifically requested this time'
      };
      
      const createWithOverride = await apiCall('/bookings/create-with-check', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(overrideBooking)
      });
      console.log(`  ✓ Create with Override: ${createWithOverride.status}`);
    }
  }
  
  console.log('\n5️⃣ Testing Payment Flow\n');
  
  if (bookingId) {
    // Create order from booking
    const createOrder = await apiCall(`/orders/from-booking/${bookingId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✓ Create Order: ${createOrder.status}`);
    
    if (createOrder.ok) {
      orderId = createOrder.data.id;
      console.log(`  Order ID: ${orderId}`);
      console.log(`  Total: $${createOrder.data.totalAmount}`);
      
      // Process payment
      const payment = await apiCall(`/orders/${orderId}/payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: createOrder.data.totalAmount,
          method: 'CASH',
          tipAmount: 5
        })
      });
      console.log(`✓ Process Payment: ${payment.status}`);
      
      if (payment.ok) {
        console.log(`  Payment successful!`);
        console.log(`  Order state: ${payment.data.order.state}`);
      }
    }
  }
  
  console.log('\n6️⃣ Testing Edge Cases\n');
  
  // Test invalid availability request
  const invalidAvailability = await apiCall('/public/availability?staffId=invalid&serviceId=invalid&startDate=invalid&endDate=invalid');
  console.log(`✓ Invalid Availability Request: ${invalidAvailability.status} (Expected 400)`);
  
  // Test date range too large
  const largeRange = new Date();
  const largeEndDate = new Date();
  largeEndDate.setFullYear(largeEndDate.getFullYear() + 1);
  
  if (staffId && serviceId) {
    const largeRangeAvailability = await apiCall(`/public/availability?staffId=${staffId}&serviceId=${serviceId}&startDate=${largeRange.toISOString()}&endDate=${largeEndDate.toISOString()}`);
    console.log(`✓ Large Date Range: ${largeRangeAvailability.status} (Expected 400)`);
  }
  
  console.log('\n✅ COMPREHENSIVE TEST COMPLETE!\n');
}

// Run the tests
runTests().catch(console.error);