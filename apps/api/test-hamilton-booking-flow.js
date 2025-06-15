const fetch = require('node-fetch');

async function testHamiltonBookingFlow() {
  console.log('🧪 TESTING HAMILTON MERCHANT BOOKING FLOW\n');
  
  let staffId, serviceId, bookingId, orderId, token;
  
  // Step 1: Get test data through public endpoints
  console.log('1️⃣ Getting test data...\n');
  
  const staffRes = await fetch('http://localhost:3000/api/public/staff');
  const staffData = await staffRes.json();
  const testStaff = staffData.data?.find(s => s.name === 'Test Alice' || s.name === 'Test Bob' || s.name === 'Test John' || s.name === 'Test Jane');
  
  const servicesRes = await fetch('http://localhost:3000/api/public/services');
  const servicesData = await servicesRes.json();
  const testService = servicesData.data?.find(s => s.name === 'Test Quick Cut' || s.name === 'Test Full Service' || s.name === 'Test Haircut' || s.name === 'Test Hair Color');
  
  if (!testStaff || !testService) {
    console.log('❌ Test data not found!');
    console.log('Available staff:', staffData.data?.map(s => s.name).join(', '));
    console.log('Available services:', servicesData.data?.map(s => s.name).join(', '));
    return;
  }
  
  staffId = testStaff.id;
  serviceId = testService.id;
  
  console.log(`✓ Using staff: ${testStaff.name} (${staffId})`);
  console.log(`✓ Using service: ${testService.name} (${serviceId})`);
  
  // Step 2: Check availability
  console.log('\n2️⃣ Checking availability...\n');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setHours(18, 0, 0, 0);
  
  const availUrl = `http://localhost:3000/api/public/availability?staffId=${staffId}&serviceId=${serviceId}&startDate=${tomorrow.toISOString()}&endDate=${dayAfter.toISOString()}`;
  
  const availRes = await fetch(availUrl);
  const availData = await availRes.json();
  
  console.log(`✓ Availability check: ${availRes.status}`);
  
  if (!availRes.ok) {
    console.log('❌ Availability check failed:', availData);
    return;
  }
  
  console.log(`✓ Found ${availData.availableSlots?.length || 0} slots`);
  
  if (!availData.availableSlots?.length) {
    console.log('❌ No available slots!');
    return;
  }
  
  const slot = availData.availableSlots[0];
  const slotTime = new Date(slot.startTime);
  console.log(`✓ Using slot: ${slotTime.toLocaleString()}`);
  
  // Step 3: Create booking using public endpoint (old format)
  console.log('\n3️⃣ Creating booking via public API...\n');
  
  // Convert to old format expected by public endpoint
  const bookingDate = slotTime.toISOString().split('T')[0];
  const bookingTime = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`;
  
  const bookingData = {
    customerName: 'Hamilton Test Customer',
    customerEmail: `hamilton.test.${Date.now()}@example.com`,
    customerPhone: '+61400123456',
    serviceId: serviceId,
    staffId: staffId,
    date: bookingDate,
    startTime: bookingTime,
    notes: 'Testing Hamilton booking flow'
  };
  
  console.log('Booking data:', bookingData);
  
  const bookingRes = await fetch('http://localhost:3000/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  
  const bookingResult = await bookingRes.json();
  console.log(`✓ Booking creation: ${bookingRes.status}`);
  
  if (!bookingRes.ok) {
    console.log('❌ Booking failed:', bookingResult);
    return;
  }
  
  bookingId = bookingResult.id;
  console.log(`✓ Booking created!`);
  console.log(`  ID: ${bookingId}`);
  console.log(`  Number: ${bookingResult.bookingNumber}`);
  console.log(`  Status: ${bookingResult.status}`);
  
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
  
  // Skip payment flow for now since it's not the focus
  console.log('\n5️⃣ Skipping payment flow (not implemented yet)...\n');
  
  // Step 7: Test double booking prevention
  console.log('\n7️⃣ Testing double booking prevention...\n');
  
  // Try to book the same slot again
  const conflictData = {
    ...bookingData,
    customerEmail: `conflict.${Date.now()}@example.com`,
    customerName: 'Conflict Test Customer'
  };
  
  const conflictRes = await fetch('http://localhost:3000/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conflictData)
  });
  
  const conflictResult = await conflictRes.json();
  console.log(`✓ Conflict booking attempt: ${conflictRes.status}`);
  
  if (conflictRes.status === 409 || conflictRes.status === 400) {
    console.log('✓ Double booking correctly prevented!');
    console.log(`  Message: ${conflictResult.message}`);
  } else if (conflictRes.ok) {
    console.log('⚠️  Double booking was allowed (this might be a bug)');
  }
  
  // Step 8: Test merchant override capability
  console.log('\n8️⃣ Testing merchant override...\n');
  
  const overrideData = {
    customer: {
      email: `override.${Date.now()}@example.com`,
      phoneCode: '+61',
      phoneNumber: '400999888',
      firstName: 'Override',
      lastName: 'Test'
    },
    providerId: staffId,
    services: [serviceId],
    startTime: slot.startTime,
    notes: 'Testing override capability',
    forceOverride: true,
    overrideReason: 'Customer requested specific time'
  };
  
  const overrideRes = await fetch('http://localhost:3000/api/bookings/create-with-check', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(overrideData)
  });
  
  console.log(`✓ Override attempt: ${overrideRes.status}`);
  
  if (overrideRes.ok) {
    const overrideBooking = await overrideRes.json();
    console.log('✓ Override successful!');
    console.log(`  Booking: ${overrideBooking.bookingNumber}`);
    console.log(`  Override flag: ${overrideBooking.isOverride}`);
  } else {
    const error = await overrideRes.json();
    console.log('Override response:', error);
  }
  
  console.log('\n✅ HAMILTON BOOKING FLOW TEST COMPLETE!\n');
}

testHamiltonBookingFlow().catch(console.error);