import axios from 'axios';

const API_URL = 'http://localhost:3001';
const MERCHANT_USERNAME = 'HAMILTON';

// Helper function to generate random time slots
function generateTimeSlot(date: Date, hour: number, minute: number = 0): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/merchant/login`, {
      username: MERCHANT_USERNAME,
      password: 'demo123'
    });
    return response.data.token;
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getServices(token: string) {
  try {
    const response = await axios.get(`${API_URL}/api/services`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to get services:', error.response?.data || error.message);
    return [];
  }
}

async function getStaff(token: string) {
  try {
    const response = await axios.get(`${API_URL}/api/staff`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to get staff:', error.response?.data || error.message);
    return [];
  }
}

async function getCustomers(token: string) {
  try {
    const response = await axios.get(`${API_URL}/api/customers`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to get customers:', error.response?.data || error.message);
    return [];
  }
}

async function createCustomer(token: string, customerData: any) {
  try {
    const response = await axios.post(`${API_URL}/api/customers`, customerData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to create customer:', error.response?.data || error.message);
    return null;
  }
}

async function createBooking(token: string, bookingData: any) {
  try {
    const response = await axios.post(`${API_URL}/api/bookings`, bookingData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✓ Created booking: ${response.data.bookingNumber} - ${bookingData.customerName} at ${new Date(bookingData.startTime).toLocaleString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to create booking:', error.response?.data || error.message);
    return null;
  }
}

async function updateBookingStatus(token: string, bookingId: string, status: string) {
  try {
    const response = await axios.patch(`${API_URL}/api/bookings/${bookingId}`, 
      { status },
      { headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✓ Updated booking ${bookingId} status to ${status}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update booking status:', error.response?.data || error.message);
    return null;
  }
}

async function populateBookings() {
  console.log('Starting booking population...\n');
  
  try {
    // Login
    console.log('Logging in...');
    const token = await login();
    console.log('✓ Login successful\n');

    // Get existing data
    console.log('Fetching existing data...');
    const [services, staff, customers] = await Promise.all([
      getServices(token),
      getStaff(token),
      getCustomers(token)
    ]);
    
    console.log(`Found ${services?.length || 0} services, ${staff?.length || 0} staff members, ${customers?.length || 0} customers\n`);

    // Create sample customers if needed
    const sampleCustomers = [
      { name: 'Emma Wilson', email: 'emma.wilson@example.com', phone: '0412345678' },
      { name: 'Liam Brown', email: 'liam.brown@example.com', phone: '0423456789' },
      { name: 'Olivia Taylor', email: 'olivia.taylor@example.com', phone: '0434567890' },
      { name: 'Noah Martinez', email: 'noah.martinez@example.com', phone: '0445678901' },
      { name: 'Ava Johnson', email: 'ava.johnson@example.com', phone: '0456789012' },
      { name: 'Sophia Davis', email: 'sophia.davis@example.com', phone: '0467890123' },
      { name: 'Mason Miller', email: 'mason.miller@example.com', phone: '0478901234' },
      { name: 'Isabella Garcia', email: 'isabella.garcia@example.com', phone: '0489012345' },
      { name: 'Lucas Anderson', email: 'lucas.anderson@example.com', phone: '0490123456' },
      { name: 'Mia Robinson', email: 'mia.robinson@example.com', phone: '0401234567' }
    ];

    if (customers.length < 5) {
      console.log('Creating sample customers...');
      for (const customerData of sampleCustomers) {
        const customer = await createCustomer(token, customerData);
        if (customer) {
          customers.push(customer);
        }
      }
      console.log(`✓ Created ${sampleCustomers.length} sample customers\n`);
    }

    // Define booking scenarios
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);
    const twoWeeks = addDays(today, 14);

    const bookingScenarios = [
      // Today's bookings
      { date: today, hour: 9, minute: 0, status: 'completed' },
      { date: today, hour: 10, minute: 0, status: 'completed' },
      { date: today, hour: 11, minute: 30, status: 'completed' },
      { date: today, hour: 13, minute: 0, status: 'confirmed' },
      { date: today, hour: 14, minute: 30, status: 'confirmed' },
      { date: today, hour: 15, minute: 0, status: 'confirmed' },
      { date: today, hour: 16, minute: 0, status: 'confirmed' },
      { date: today, hour: 17, minute: 0, status: 'cancelled' },
      
      // Tomorrow's bookings
      { date: tomorrow, hour: 9, minute: 30, status: 'confirmed' },
      { date: tomorrow, hour: 10, minute: 0, status: 'confirmed' },
      { date: tomorrow, hour: 11, minute: 0, status: 'confirmed' },
      { date: tomorrow, hour: 12, minute: 0, status: 'confirmed' },
      { date: tomorrow, hour: 14, minute: 0, status: 'confirmed' },
      { date: tomorrow, hour: 15, minute: 30, status: 'confirmed' },
      { date: tomorrow, hour: 16, minute: 30, status: 'confirmed' },
      
      // Next week bookings
      { date: nextWeek, hour: 10, minute: 0, status: 'confirmed' },
      { date: nextWeek, hour: 11, minute: 30, status: 'confirmed' },
      { date: nextWeek, hour: 13, minute: 0, status: 'confirmed' },
      { date: nextWeek, hour: 14, minute: 0, status: 'confirmed' },
      { date: nextWeek, hour: 15, minute: 30, status: 'confirmed' },
      
      // Two weeks out bookings
      { date: twoWeeks, hour: 9, minute: 0, status: 'confirmed' },
      { date: twoWeeks, hour: 10, minute: 30, status: 'confirmed' },
      { date: twoWeeks, hour: 12, minute: 0, status: 'confirmed' },
      { date: twoWeeks, hour: 14, minute: 30, status: 'confirmed' },
      { date: twoWeeks, hour: 16, minute: 0, status: 'confirmed' }
    ];

    console.log('Creating bookings...\n');

    for (const scenario of bookingScenarios) {
      // Random selections
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const staffMember = staff[Math.floor(Math.random() * staff.length)];
      
      if (!customer || !service || !staffMember) {
        console.log('Skipping booking - missing required data');
        continue;
      }

      // Calculate end time based on service duration
      const startTime = generateTimeSlot(scenario.date, scenario.hour, scenario.minute);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (service.duration || 60));

      const bookingData = {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        serviceId: service.id,
        serviceName: service.name,
        staffId: staffMember.id,
        staffName: staffMember.name,
        startTime: startTime,
        endTime: endTime.toISOString(),
        price: service.price,
        status: 'pending', // Start with pending
        notes: `Test booking for ${service.name}`
      };

      const booking = await createBooking(token, bookingData);
      
      // Update status if needed
      if (booking && scenario.status !== 'pending') {
        await updateBookingStatus(token, booking.id, scenario.status);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✓ Booking population completed!');
    
  } catch (error) {
    console.error('Population failed:', error);
  }
}

// Run the population script
populateBookings().catch(console.error);