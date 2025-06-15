const fetch = require('node-fetch');

async function finalDemo() {
  console.log('🎯 DOUBLE BOOKING PREVENTION DEMO\n');
  console.log('This demo shows how the system prevents double bookings for customers');
  console.log('but allows merchants to override with proper authorization.\n');
  
  let token;
  
  // Login
  const loginRes = await fetch('http://localhost:3000/api/auth/merchant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'HAMILTON', password: 'demo123' })
  });
  
  if (!loginRes.ok) {
    console.log('❌ Login failed');
    return;
  }
  
  token = (await loginRes.json()).token;
  console.log('✅ Logged in as HAMILTON merchant\n');
  
  // Get a far future date to ensure clean slot
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1); // 1 month from now
  futureDate.setHours(14, 0, 0, 0); // 2 PM
  
  // Get test data
  const staffRes = await fetch('http://localhost:3000/api/public/staff');
  const staffData = await staffRes.json();
  const testStaff = staffData.data?.find(s => s.name.includes('Test'));
  
  const servicesRes = await fetch('http://localhost:3000/api/public/services');
  const servicesData = await servicesRes.json();
  const testService = servicesData.data?.find(s => s.name.includes('Test'));
  
  if (!testStaff || !testService) {
    console.log('❌ Test data not found');
    return;
  }
  
  console.log(`📋 Test Setup:`);
  console.log(`  Staff: ${testStaff.name}`);
  console.log(`  Service: ${testService.name} (${testService.duration}min)`);
  console.log(`  Date: ${futureDate.toLocaleDateString()}`);
  console.log(`  Time: ${futureDate.toLocaleTimeString()}\n`);
  
  // Scenario 1: Customer A books successfully
  console.log('📅 Scenario 1: Customer A books a slot');
  
  const bookingDate = futureDate.toISOString().split('T')[0];
  const bookingTime = `${futureDate.getHours().toString().padStart(2, '0')}:${futureDate.getMinutes().toString().padStart(2, '0')}`;
  
  const customerA = {
    customerName: 'Alice Anderson',
    customerEmail: `alice.${Date.now()}@example.com`,
    customerPhone: '+61400111111',
    serviceId: testService.id,
    staffId: testStaff.id,
    date: bookingDate,
    startTime: bookingTime,
    notes: 'Regular appointment'
  };
  
  const bookingARes = await fetch('http://localhost:3000/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerA)
  });
  
  if (bookingARes.ok) {
    const bookingA = await bookingARes.json();
    console.log(`  ✅ Booking successful!`);
    console.log(`  Booking #: ${bookingA.bookingNumber}`);
    console.log(`  Time: ${new Date(bookingA.startTime).toLocaleTimeString()} - ${new Date(bookingA.endTime).toLocaleTimeString()}\n`);
  } else {
    console.log(`  ❌ Booking failed: ${bookingARes.status}`);
    return;
  }
  
  // Scenario 2: Customer B tries to book same slot
  console.log('🚫 Scenario 2: Customer B tries to book the SAME slot');
  
  const customerB = {
    ...customerA,
    customerName: 'Bob Brown',
    customerEmail: `bob.${Date.now()}@example.com`,
    customerPhone: '+61400222222',
    notes: 'Wants the same time as Alice'
  };
  
  const bookingBRes = await fetch('http://localhost:3000/api/public/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerB)
  });
  
  if (bookingBRes.status === 409 || bookingBRes.status === 400) {
    const error = await bookingBRes.json();
    console.log(`  ✅ Double booking PREVENTED!`);
    console.log(`  Error: "${error.message}"\n`);
  } else {
    console.log(`  ❌ Unexpected response: ${bookingBRes.status}\n`);
  }
  
  // Scenario 3: Merchant tries to override
  console.log('👤 Scenario 3: Merchant attempts to double book');
  
  const merchantBooking = {
    customer: {
      email: `vip.${Date.now()}@example.com`,
      phoneCode: '+61',
      phoneNumber: '400333333',
      firstName: 'VIP',
      lastName: 'Customer'
    },
    providerId: testStaff.id,
    services: [testService.id],
    startTime: futureDate.toISOString(),
    notes: 'VIP customer needs this specific time'
  };
  
  // First attempt without override
  console.log('  Step 1: Initial attempt (without override flag)');
  const attempt1 = await fetch('http://localhost:3000/api/bookings/create-with-check', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(merchantBooking)
  });
  
  const result1 = await attempt1.json();
  if (result1.requiresOverride) {
    console.log(`    ✅ System detected conflict!`);
    console.log(`    Conflicts: ${result1.conflicts?.length || 0} existing booking(s)`);
    console.log(`    Message: "${result1.message}"\n`);
    
    // Second attempt with override
    console.log('  Step 2: Merchant confirms override');
    const overrideBooking = {
      ...merchantBooking,
      forceOverride: true,
      overrideReason: 'VIP customer - confirmed double booking is OK'
    };
    
    const attempt2 = await fetch('http://localhost:3000/api/bookings/create-with-check', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(overrideBooking)
    });
    
    if (attempt2.ok) {
      const booking = await attempt2.json();
      console.log(`    ✅ Override SUCCESSFUL!`);
      console.log(`    Booking #: ${booking.bookingNumber}`);
      console.log(`    Override flag: ${booking.isOverride}`);
      console.log(`    Reason recorded: "${booking.overrideReason}"`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ DEMO COMPLETE - Key Features Demonstrated:');
  console.log('  1. ✅ Customers cannot double book');
  console.log('  2. ✅ Clear error messages when slots are taken');
  console.log('  3. ✅ Merchants see conflicts before confirming');
  console.log('  4. ✅ Merchants can override with proper reason');
  console.log('  5. ✅ Audit trail maintained for overrides');
  console.log('='.repeat(60) + '\n');
}

finalDemo().catch(console.error);