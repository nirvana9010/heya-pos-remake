const fetch = require('node-fetch');

async function testAvailability() {
  console.log('🧪 Testing Availability Endpoints\n');
  
  // First, get our test staff and services
  console.log('1️⃣ Getting test data...\n');
  
  const staffRes = await fetch('http://localhost:3000/api/public/staff');
  const staffData = await staffRes.json();
  const testStaff = staffData.data?.find(s => s.name.includes('Test Jane') || s.name.includes('Test John')) || 
                    staffData.data?.find(s => s.name === 'Jane Smith' || s.name === 'John Doe');
  
  const servicesRes = await fetch('http://localhost:3000/api/public/services');
  const servicesData = await servicesRes.json();
  const testService = servicesData.data?.find(s => s.name.includes('Test Haircut') || s.name.includes('Test Hair Color')) ||
                      servicesData.data?.find(s => s.name === 'Haircut' || s.name === 'Hair Color');
  
  if (!testStaff || !testService) {
    console.log('❌ Test data not found!');
    console.log('Staff:', testStaff);
    console.log('Service:', testService);
    return;
  }
  
  console.log(`✓ Using staff: ${testStaff.name} (${testStaff.id})`);
  console.log(`✓ Using service: ${testService.name} (${testService.id})`);
  
  // Test availability endpoint
  console.log('\n2️⃣ Testing availability endpoint...\n');
  
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  endDate.setHours(23, 59, 59, 999);
  
  const availUrl = `http://localhost:3000/api/public/availability?staffId=${testStaff.id}&serviceId=${testService.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
  console.log(`Request URL: ${availUrl}`);
  
  const availRes = await fetch(availUrl);
  const availData = await availRes.json();
  
  console.log(`Status: ${availRes.status}`);
  console.log('Response:', JSON.stringify(availData, null, 2));
  
  // Test booking creation
  if (availRes.ok && availData.availableSlots?.length > 0) {
    console.log('\n3️⃣ Testing booking creation...\n');
    
    const bookingTime = new Date(availData.availableSlots[0].startTime);
    const bookingData = {
      customer: {
        email: 'test.availability@example.com',
        phoneCode: '+61',
        phoneNumber: '412345678',
        firstName: 'Test',
        lastName: 'Availability'
      },
      providerId: testStaff.id,
      services: [testService.id],
      startTime: bookingTime.toISOString(),
      notes: 'Testing availability flow'
    };
    
    console.log('Booking data:', JSON.stringify(bookingData, null, 2));
    
    const bookingRes = await fetch('http://localhost:3000/api/public/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    const bookingResult = await bookingRes.json();
    console.log(`Booking status: ${bookingRes.status}`);
    console.log('Booking result:', JSON.stringify(bookingResult, null, 2));
  }
  
  // Test with merchant auth
  console.log('\n4️⃣ Testing merchant availability endpoint...\n');
  
  const loginRes = await fetch('http://localhost:3000/api/auth/merchant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'HAMILTON', password: 'demo123' })
  });
  
  if (loginRes.ok) {
    const { token } = await loginRes.json();
    console.log('✓ Logged in as merchant');
    
    const merchantAvailUrl = `http://localhost:3000/api/bookings/available-slots?staffId=${testStaff.id}&serviceId=${testService.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    
    const merchantAvailRes = await fetch(merchantAvailUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const merchantAvailData = await merchantAvailRes.json();
    console.log(`Merchant availability status: ${merchantAvailRes.status}`);
    console.log('Available slots:', merchantAvailData.availableSlots?.filter(s => s.available).length || 0);
    console.log('Conflicted slots:', merchantAvailData.availableSlots?.filter(s => !s.available).length || 0);
    
    if (merchantAvailData.availableSlots?.length > 0) {
      console.log('\nFirst few slots:');
      merchantAvailData.availableSlots.slice(0, 3).forEach(slot => {
        console.log(`  ${slot.startTime} - ${slot.endTime}: ${slot.available ? '✓ Available' : '✗ Conflicted'}`);
        if (!slot.available && slot.conflicts) {
          console.log(`    Conflicts: ${slot.conflicts.map(c => c.bookingNumber).join(', ')}`);
        }
      });
    }
  }
}

testAvailability().catch(console.error);