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

// Helper function to get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate random phone number
function generatePhone(): string {
  const prefix = ['0412', '0423', '0434', '0445', '0456', '0467', '0478', '0489', '0490', '0401'];
  return prefix[Math.floor(Math.random() * prefix.length)] + Math.floor(Math.random() * 9000000 + 1000000);
}

// First names for generating customers
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia',
  'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Ella', 'Avery', 'Sofia',
  'James', 'William', 'Benjamin', 'Elijah', 'Oliver', 'Jacob', 'Daniel', 'Logan', 'Michael', 'Alexander',
  'Sarah', 'Jessica', 'Ashley', 'Rachel', 'Samantha', 'Katherine', 'Amanda', 'Jennifer', 'Lauren', 'Melissa',
  'John', 'Robert', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Matthew', 'Anthony'
];

// Last names for generating customers
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White',
  'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall',
  'Chen', 'Wang', 'Li', 'Zhang', 'Kumar', 'Singh', 'Patel', 'Kim', 'Park', 'Nguyen'
];

// Booking notes templates
const notesTemplates = [
  'Regular customer - prefers organic products',
  'First time visitor - referred by friend',
  'Special occasion - birthday treat',
  'Monthly appointment - please confirm 24h before',
  'Sensitive skin - use hypoallergenic products',
  'VIP client - extra attention required',
  'Group booking - bridal party',
  'Corporate client - invoice required',
  'Preferred morning appointments',
  'Last minute booking',
  'Package deal customer',
  'Loyalty program member',
  'Anniversary special',
  'Gift voucher redemption',
  'Walk-in converted to regular',
  'Prefers specific room/chair',
  'Running late - called ahead',
  'Express service requested',
  'Combination treatment',
  'Follow-up appointment'
];

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
    return response.data;
  } catch (error: any) {
    // Silently skip if booking conflicts
    if (error.response?.status === 409) {
      return null;
    }
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
    return response.data;
  } catch (error: any) {
    console.error('Failed to update booking status:', error.response?.data || error.message);
    return null;
  }
}

async function populateBusyBookings() {
  console.log('🚀 Starting BUSY booking population...\n');
  
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

    // Create additional customers if needed (aim for at least 50)
    const targetCustomerCount = 50;
    const customersToCreate = Math.max(0, targetCustomerCount - customers.length);
    
    if (customersToCreate > 0) {
      console.log(`Creating ${customersToCreate} additional customers...`);
      for (let i = 0; i < customersToCreate; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const customerData = {
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`,
          phone: generatePhone()
        };
        
        const customer = await createCustomer(token, customerData);
        if (customer) {
          customers.push(customer);
        }
      }
      console.log(`✓ Total customers: ${customers.length}\n`);
    }

    // Define time slots (15-minute intervals from 9 AM to 8 PM)
    const timeSlots: { hour: number, minute: number }[] = [];
    for (let hour = 9; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        timeSlots.push({ hour, minute });
      }
    }

    // Calculate date range
    const today = new Date();
    const startDate = addDays(today, -7); // Last week
    const endDate = addDays(today, 7);    // Next week

    console.log('📅 Creating DENSE bookings from last week to next week...\n');

    let totalBookings = 0;
    let bookingsByDay: { [key: string]: number } = {};

    // For each day in the range
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      // Skip Sundays or reduce bookings
      if (dayOfWeek === 0) {
        continue;
      }

      // Determine booking density based on day
      let bookingProbability = 0.7; // 70% of slots filled on average
      
      // Make today and tomorrow extra busy
      const daysFromToday = Math.floor((currentDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (daysFromToday === 0 || daysFromToday === 1) {
        bookingProbability = 0.9; // 90% of slots filled
      }
      
      // Saturdays are busier
      if (dayOfWeek === 6) {
        bookingProbability = 0.85;
      }

      console.log(`📅 ${dateKey} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}) - Density: ${Math.round(bookingProbability * 100)}%`);

      let dailyBookings = 0;

      // For each staff member
      for (const staffMember of staff) {
        // For each time slot
        for (const slot of timeSlots) {
          // Skip early morning and late evening randomly
          if ((slot.hour === 9 && Math.random() < 0.5) || (slot.hour === 19 && Math.random() < 0.7)) {
            continue;
          }

          // Lunch break - reduce bookings between 12-1 PM
          if (slot.hour === 12 && Math.random() < 0.7) {
            continue;
          }

          // Determine if this slot should have a booking
          if (Math.random() < bookingProbability) {
            const customer = getRandomItem(customers);
            const selectedServices = [];
            
            // 70% single service, 25% two services, 5% three services
            const serviceCount = Math.random() < 0.7 ? 1 : Math.random() < 0.95 ? 2 : 3;
            
            for (let i = 0; i < serviceCount; i++) {
              const service = getRandomItem(services);
              if (!selectedServices.find(s => s.id === service.id)) {
                selectedServices.push(service);
              }
            }

            // Calculate booking times
            const startTime = generateTimeSlot(currentDate, slot.hour, slot.minute);
            const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + totalDuration);

            // Determine status based on date
            let status = 'CONFIRMED';
            if (currentDate < today) {
              // Past bookings
              const statusRand = Math.random();
              if (statusRand < 0.7) status = 'COMPLETED';
              else if (statusRand < 0.85) status = 'CANCELLED';
              else if (statusRand < 0.95) status = 'NO_SHOW';
              else status = 'CONFIRMED';
            } else if (currentDate.toDateString() === today.toDateString()) {
              // Today's bookings
              const currentHour = today.getHours();
              if (slot.hour < currentHour) {
                status = Math.random() < 0.8 ? 'COMPLETED' : 'NO_SHOW';
              } else if (slot.hour === currentHour) {
                status = 'IN_PROGRESS';
              } else {
                status = Math.random() < 0.9 ? 'CONFIRMED' : 'PENDING';
              }
            } else {
              // Future bookings
              status = Math.random() < 0.8 ? 'CONFIRMED' : 'PENDING';
            }

            const bookingData = {
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone,
              customerEmail: customer.email,
              serviceId: selectedServices[0].id,
              serviceName: selectedServices.map(s => s.name).join(', '),
              staffId: staffMember.id,
              staffName: staffMember.name,
              startTime: startTime,
              endTime: endTime.toISOString(),
              price: selectedServices.reduce((sum, s) => sum + s.price, 0),
              status: 'PENDING',
              notes: getRandomItem(notesTemplates),
              // Additional services if any
              services: selectedServices.map(s => ({
                serviceId: s.id,
                serviceName: s.name,
                price: s.price,
                duration: s.duration
              }))
            };

            const booking = await createBooking(token, bookingData);
            
            if (booking) {
              // Update status if needed
              if (status !== 'PENDING') {
                await updateBookingStatus(token, booking.id, status);
              }
              dailyBookings++;
              totalBookings++;
            }
          }
        }
      }

      bookingsByDay[dateKey] = dailyBookings;
      console.log(`   Created ${dailyBookings} bookings\n`);

      // Small delay between days to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create some double-bookings for testing conflicts
    console.log('🔄 Creating some overlapping bookings to test conflict handling...\n');
    
    const tomorrow = addDays(today, 1);
    let conflictCount = 0;
    
    // Try to create 10 deliberate conflicts
    for (let i = 0; i < 10; i++) {
      const slot = getRandomItem(timeSlots.slice(4, -4)); // Avoid very early/late slots
      const staffMember = getRandomItem(staff);
      const customers2 = [getRandomItem(customers), getRandomItem(customers)];
      const service = getRandomItem(services);
      
      for (const customer of customers2) {
        const startTime = generateTimeSlot(tomorrow, slot.hour, slot.minute);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

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
          status: 'CONFIRMED',
          notes: 'Testing overlapping bookings'
        };

        const booking = await createBooking(token, bookingData);
        if (booking) {
          conflictCount++;
        }
      }
    }

    // Summary
    console.log('\n✅ BUSY booking population completed!');
    console.log('📊 Summary:');
    console.log(`   - Total bookings created: ${totalBookings}`);
    console.log(`   - Average bookings per day: ${Math.round(totalBookings / Object.keys(bookingsByDay).length)}`);
    console.log(`   - Busiest day: ${Object.entries(bookingsByDay).sort((a, b) => b[1] - a[1])[0].join(': ')} bookings`);
    console.log(`   - Conflict attempts: ${conflictCount}`);
    console.log('\n📅 Daily breakdown:');
    
    Object.entries(bookingsByDay).sort().forEach(([date, count]) => {
      const dayDate = new Date(date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
      const bar = '█'.repeat(Math.floor(count / 5));
      console.log(`   ${date} (${dayName}): ${bar} ${count}`);
    });
    
  } catch (error) {
    console.error('Population failed:', error);
  }
}

// Run the population script
populateBusyBookings().catch(console.error);