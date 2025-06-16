const fetch = require('node-fetch');

async function testNewBookingAPI() {
  console.log('🧪 Testing New Booking API\n');
  
  let token;
  
  // Step 1: Login as merchant
  console.log('1️⃣ Logging in as merchant...\n');
  
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/merchant/login', {
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
  
  // Step 2: Get test data through merchant API
  console.log('\n2️⃣ Getting test data...\n');
  
  const staffRes = await fetch('http://localhost:3000/api/v1/staff', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const staffData = await staffRes.json();
  const testStaff = staffData.find(s => s.firstName === 'Test' && (s.lastName === 'Jane' || s.lastName === 'John'));
  
  const servicesRes = await fetch('http://localhost:3000/api/v1/services', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const servicesData = await servicesRes.json();
  const services = servicesData.data || [];
  const testService = services.find(s => s.name.includes('Test Haircut') || s.name.includes('Test Hair Color'));
  
  if (!testStaff || !testService) {
    console.log('❌ Test data not found!');
    console.log('Staff:', testStaff);
    console.log('Service:', testService);
    return;
  }
  
  console.log(`✓ Using staff: ${testStaff.firstName} ${testStaff.lastName} (${testStaff.id})`);
  console.log(`✓ Using service: ${testService.name} (${testService.id})`);
  
  // Step 3: Check available slots
  console.log('\n3️⃣ Checking available slots...\n');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  const availUrl = `http://localhost:3000/api/v2/bookings/availability?staffId=${testStaff.id}&serviceId=${testService.id}&startDate=${tomorrow.toISOString()}&endDate=${dayAfter.toISOString()}`;
  
  const availRes = await fetch(availUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const availData = await availRes.json();
  
  console.log(`✓ Available slots check: ${availRes.status}`);
  
  if (!availData.availableSlots?.length) {
    console.log('❌ No slots found!');
    return;
  }
  
  const availableSlot = availData.availableSlots.find(s => s.available);
  if (!availableSlot) {
    console.log('❌ No available slots!');
    return;
  }
  
  console.log(`✓ Found ${availData.availableSlots.length} slots`);
  console.log(`✓ Using slot: ${new Date(availableSlot.startTime).toLocaleString()}`);
  
  // Step 4: Create booking with check
  console.log('\n4️⃣ Creating booking with conflict check...\n');
  
  const bookingData = {
    customer: {
      email: 'new.api.test@example.com',
      phoneCode: '+61',
      phoneNumber: '412345678',
      firstName: 'New API',
      lastName: 'Test'
    },
    providerId: testStaff.id,
    services: [testService.id],
    startTime: availableSlot.startTime,
    notes: 'Testing new booking API'
  };
  
  const bookingRes = await fetch('http://localhost:3000/api/v2/bookings', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });
  
  const bookingResult = await bookingRes.json();
  console.log(`✓ Booking creation: ${bookingRes.status}`);
  
  if (bookingRes.ok) {
    console.log(`✓ Booking created successfully!`);
    console.log(`  ID: ${bookingResult.id}`);
    console.log(`  Number: ${bookingResult.bookingNumber}`);
    console.log(`  Status: ${bookingResult.status}`);
    
    // Step 5: Test double booking
    console.log('\n5️⃣ Testing double booking prevention...\n');
    
    const conflictRes = await fetch('http://localhost:3000/api/v2/bookings', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...bookingData,
        customer: { ...bookingData.customer, email: 'conflict@example.com' }
      })
    });
    
    const conflictResult = await conflictRes.json();
    console.log(`✓ Conflict check: ${conflictRes.status}`);
    
    if (conflictResult.requiresOverride) {
      console.log('✓ Conflict detected correctly!');
      console.log(`  Message: ${conflictResult.message}`);
      console.log(`  Conflicts: ${conflictResult.conflicts?.length}`);
    }
    
    // Create order and process payment
    console.log('\n6️⃣ Creating order and processing payment...\n');
    
    const orderRes = await fetch(`http://localhost:3000/api/v1/payments/orders/from-booking/${bookingResult.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (orderRes.ok) {
      const order = await orderRes.json();
      console.log(`✓ Order created: ${order.orderNumber}`);
      console.log(`  Total: $${order.totalAmount}`);
      
      const paymentRes = await fetch(`http://localhost:3000/api/v1/payments/process`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(order.totalAmount),
          method: 'CASH',
          tipAmount: 5
        })
      });
      
      if (paymentRes.ok) {
        console.log('✓ Payment processed successfully!');
      }
    }
    
  } else {
    console.log('❌ Booking failed:', bookingResult);
  }
  
  console.log('\n✅ NEW API TEST COMPLETE!\n');
}

testNewBookingAPI().catch(console.error);