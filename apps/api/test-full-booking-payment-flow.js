const fetch = require('node-fetch');

async function testFullFlow() {
  console.log('🧪 TESTING COMPLETE BOOKING AND PAYMENT FLOW\n');
  
  let token, bookingId, orderId;
  
  // Step 1: Find test data
  console.log('1️⃣ Finding test data...\n');
  
  const staffRes = await fetch('http://localhost:3000/api/public/staff');
  const staffData = await staffRes.json();
  const testStaff = staffData.data?.find(s => s.name.includes('Test Jane') || s.name.includes('Test John'));
  
  const servicesRes = await fetch('http://localhost:3000/api/public/services');
  const servicesData = await servicesRes.json();
  const testService = servicesData.data?.find(s => s.name.includes('Test Haircut') || s.name.includes('Test Hair Color'));
  
  if (!testStaff || !testService) {
    console.log('❌ Test data not found!');
    return;
  }
  
  console.log(`✓ Using staff: ${testStaff.name} (${testStaff.id})`);
  console.log(`✓ Using service: ${testService.name} (${testService.id})`);
  
  // Step 2: Check availability
  console.log('\n2️⃣ Checking availability...\n');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  const availUrl = `http://localhost:3000/api/public/availability?staffId=${testStaff.id}&serviceId=${testService.id}&startDate=${tomorrow.toISOString()}&endDate=${dayAfter.toISOString()}`;
  
  const availRes = await fetch(availUrl);
  const availData = await availRes.json();
  
  console.log(`✓ Availability check: ${availRes.status}`);
  console.log(`✓ Found ${availData.availableSlots?.length || 0} slots`);
  
  if (!availData.availableSlots?.length) {
    console.log('❌ No available slots found!');
    return;
  }
  
  const bookingTime = new Date(availData.availableSlots[0].startTime);
  console.log(`✓ Booking at: ${bookingTime.toLocaleString()}`);
  
  // Step 3: Create booking as customer
  console.log('\n3️⃣ Creating booking as customer...\n');
  
  // Format date and time for the old booking format
  const bookingDate = bookingTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const bookingHour = bookingTime.getHours().toString().padStart(2, '0');
  const bookingMinute = bookingTime.getMinutes().toString().padStart(2, '0');
  const bookingTimeStr = `${bookingHour}:${bookingMinute}`;
  
  const bookingData = {
    customerName: 'Flow Test',
    customerEmail: 'test.flow@example.com',
    customerPhone: '+61412345678',
    serviceId: testService.id,
    staffId: testStaff.id,
    date: bookingDate,
    startTime: bookingTimeStr,
    notes: 'Full flow test booking'
  };
  
  const bookingRes = await fetch('http://localhost:3000/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  
  const bookingResult = await bookingRes.json();
  console.log(`✓ Booking creation: ${bookingRes.status}`);
  
  if (bookingRes.ok) {
    bookingId = bookingResult.id;
    console.log(`✓ Booking ID: ${bookingId}`);
    console.log(`✓ Booking number: ${bookingResult.bookingNumber}`);
    console.log(`✓ Status: ${bookingResult.status}`);
  } else {
    console.log('❌ Booking failed:', bookingResult);
    return;
  }
  
  // Step 4: Login as merchant
  console.log('\n4️⃣ Logging in as merchant...\n');
  
  const loginRes = await fetch('http://localhost:3000/api/auth/merchant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'HAMILTON', password: 'demo123' })
  });
  
  if (loginRes.ok) {
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('✓ Login successful');
  } else {
    console.log('❌ Login failed');
    return;
  }
  
  // Step 5: Create order from booking
  console.log('\n5️⃣ Creating order from booking...\n');
  
  const orderRes = await fetch(`http://localhost:3000/api/orders/from-booking/${bookingId}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const orderResult = await orderRes.json();
  console.log(`✓ Order creation: ${orderRes.status}`);
  
  if (orderRes.ok) {
    orderId = orderResult.id;
    console.log(`✓ Order ID: ${orderId}`);
    console.log(`✓ Order number: ${orderResult.orderNumber}`);
    console.log(`✓ Total amount: $${orderResult.totalAmount}`);
    console.log(`✓ State: ${orderResult.state}`);
  } else {
    console.log('❌ Order creation failed:', orderResult);
    return;
  }
  
  // Step 6: Process payment
  console.log('\n6️⃣ Processing payment...\n');
  
  const paymentData = {
    amount: parseFloat(orderResult.totalAmount),
    method: 'CASH',
    tipAmount: 10
  };
  
  const paymentRes = await fetch(`http://localhost:3000/api/orders/${orderId}/payment`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(paymentData)
  });
  
  const paymentResult = await paymentRes.json();
  console.log(`✓ Payment processing: ${paymentRes.status}`);
  
  if (paymentRes.ok) {
    console.log(`✓ Payment successful!`);
    console.log(`✓ Payment ID: ${paymentResult.payment.id}`);
    console.log(`✓ Order state: ${paymentResult.order.state}`);
    console.log(`✓ Tip allocated: $${paymentData.tipAmount}`);
  } else {
    console.log('❌ Payment failed:', paymentResult);
  }
  
  // Step 7: Test double booking prevention
  console.log('\n7️⃣ Testing double booking prevention...\n');
  
  const conflictBooking = {
    customer: {
      email: 'conflict@example.com',
      phoneCode: '+61',
      phoneNumber: '498765432',
      firstName: 'Conflict',
      lastName: 'Test'
    },
    providerId: testStaff.id,
    services: [testService.id],
    startTime: bookingTime,
    notes: 'Testing double booking'
  };
  
  const conflictRes = await fetch('http://localhost:3000/api/bookings/create-with-check', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(conflictBooking)
  });
  
  const conflictResult = await conflictRes.json();
  console.log(`✓ Conflict check: ${conflictRes.status}`);
  
  if (conflictResult.requiresOverride) {
    console.log('✓ Conflict detected correctly!');
    console.log(`  Conflicts: ${conflictResult.conflicts?.length || 0}`);
    
    // Try with override
    const overrideBooking = {
      ...conflictBooking,
      forceOverride: true,
      overrideReason: 'Customer insisted on this time'
    };
    
    const overrideRes = await fetch('http://localhost:3000/api/bookings/create-with-check', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(overrideBooking)
    });
    
    console.log(`✓ Override attempt: ${overrideRes.status}`);
    if (overrideRes.ok) {
      const overrideResult = await overrideRes.json();
      console.log(`✓ Override successful: ${overrideResult.bookingNumber}`);
    }
  }
  
  console.log('\n✅ FULL FLOW TEST COMPLETE!\n');
}

testFullFlow().catch(console.error);