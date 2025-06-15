import { PrismaClient } from '@prisma/client';
import { addDays, setHours, setMinutes, subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

// Realistic customer distribution for a beauty spa
const CUSTOMER_PROFILES = [
  // VIP/Regular customers (20% - come frequently)
  { firstName: 'Sarah', lastName: 'Johnson', frequency: 'vip', visits: 45, email: 'sarah.j@email.com', phone: '+61 400 111 222' },
  { firstName: 'Emily', lastName: 'Chen', frequency: 'vip', visits: 38, email: 'emily.chen@email.com', phone: '+61 400 222 333' },
  { firstName: 'Jessica', lastName: 'Williams', frequency: 'vip', visits: 42, email: 'jess.w@email.com', phone: '+61 400 333 444' },
  { firstName: 'Lisa', lastName: 'Anderson', frequency: 'vip', visits: 35, email: 'lisa.a@email.com', phone: '+61 400 444 555' },
  
  // Regular customers (30% - monthly visits)
  { firstName: 'Amanda', lastName: 'Taylor', frequency: 'regular', visits: 12, email: 'amanda.t@email.com', phone: '+61 401 111 222' },
  { firstName: 'Michelle', lastName: 'Brown', frequency: 'regular', visits: 15, email: 'michelle.b@email.com', phone: '+61 401 222 333' },
  { firstName: 'Nicole', lastName: 'Davis', frequency: 'regular', visits: 18, email: 'nicole.d@email.com', phone: '+61 401 333 444' },
  { firstName: 'Rachel', lastName: 'Miller', frequency: 'regular', visits: 14, email: 'rachel.m@email.com', phone: '+61 401 444 555' },
  { firstName: 'Sophia', lastName: 'Wilson', frequency: 'regular', visits: 16, email: 'sophia.w@email.com', phone: '+61 401 555 666' },
  { firstName: 'Victoria', lastName: 'Moore', frequency: 'regular', visits: 13, email: 'victoria.m@email.com', phone: '+61 401 666 777' },
  
  // Occasional customers (50% - quarterly or less)
  { firstName: 'Hannah', lastName: 'Thompson', frequency: 'occasional', visits: 4, email: 'hannah.t@email.com', phone: '+61 402 111 222' },
  { firstName: 'Olivia', lastName: 'Garcia', frequency: 'occasional', visits: 3, email: 'olivia.g@email.com', phone: '+61 402 222 333' },
  { firstName: 'Emma', lastName: 'Martinez', frequency: 'occasional', visits: 5, email: 'emma.m@email.com', phone: '+61 402 333 444' },
  { firstName: 'Ava', lastName: 'Robinson', frequency: 'occasional', visits: 2, email: 'ava.r@email.com', phone: '+61 402 444 555' },
  { firstName: 'Mia', lastName: 'Clark', frequency: 'occasional', visits: 4, email: 'mia.c@email.com', phone: '+61 402 555 666' },
  { firstName: 'Isabella', lastName: 'Rodriguez', frequency: 'occasional', visits: 3, email: 'isabella.r@email.com', phone: '+61 402 666 777' },
  { firstName: 'Charlotte', lastName: 'Lewis', frequency: 'occasional', visits: 2, email: 'charlotte.l@email.com', phone: '+61 402 777 888' },
  { firstName: 'Amelia', lastName: 'Lee', frequency: 'occasional', visits: 3, email: 'amelia.l@email.com', phone: '+61 402 888 999' },
  { firstName: 'Harper', lastName: 'Walker', frequency: 'occasional', visits: 1, email: 'harper.w@email.com', phone: '+61 402 999 000' },
  { firstName: 'Evelyn', lastName: 'Hall', frequency: 'occasional', visits: 2, email: 'evelyn.h@email.com', phone: '+61 403 111 222' },
];

// Realistic service popularity distribution
const SERVICE_POPULARITY = {
  // Most popular services (60% of bookings)
  high: [
    'Classic Facial', 'Express Facial', 'Swedish Massage', 
    'Gel Manicure', 'Eyebrow Wax', 'Hair Cut & Style'
  ],
  // Moderately popular (30% of bookings)
  medium: [
    'Anti-Aging Facial', 'Deep Tissue Massage', 'Pedicure',
    'Full Leg Wax', 'Hair Color', 'Lash Extensions'
  ],
  // Premium/specialized services (10% of bookings)
  low: [
    'Diamond Facial', 'Hot Stone Massage', 'Brazilian Wax',
    'Keratin Treatment', 'Microblading', 'Chemical Peel'
  ]
};

async function seedRealisticDemo() {
  try {
    console.log('🌱 Creating realistic demo data for Hamilton Beauty Spa...');

    // 1. Find merchant
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' }
    });
    if (!merchant) throw new Error('Merchant not found - run main seed first');

    // 2. Get required data
    const [location, staff, services, existingCustomers] = await Promise.all([
      prisma.location.findFirst({ where: { merchantId: merchant.id }}),
      prisma.staff.findMany({ where: { merchantId: merchant.id }}),
      prisma.service.findMany({ where: { merchantId: merchant.id }}),
      prisma.customer.findMany({ where: { merchantId: merchant.id }})
    ]);

    // 3. Create realistic customers if needed
    let customers: Array<any> = [];
    
    if (existingCustomers.length < 15) {
      console.log('Creating realistic customer base...');
      
      // Check which customers already exist
      const existingEmails = new Set(existingCustomers.map(c => c.email));
      
      for (const profile of CUSTOMER_PROFILES) {
        if (existingEmails.has(profile.email)) {
          // Find existing customer
          const existing = existingCustomers.find(c => c.email === profile.email);
          if (existing) {
            customers.push({ ...existing, frequency: profile.frequency } as any);
          }
          continue;
        }
        
        const customer = await prisma.customer.create({
          data: {
            merchantId: merchant.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            mobile: profile.phone,
            dateOfBirth: new Date(1970 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
            gender: 'FEMALE',
            marketingConsent: Math.random() > 0.3, // 70% opt-in
            visitCount: profile.visits,
            totalSpent: profile.visits * (80 + Math.floor(Math.random() * 120)), // $80-200 per visit
            tags: JSON.stringify([profile.frequency]),
          }
        });
        customers.push({ ...customer, frequency: profile.frequency } as any);
      }
    } else {
      console.log(`Using existing ${existingCustomers.length} customers...`);
      // Assign frequency tags to existing customers
      customers = existingCustomers.map((c, i) => ({
        ...c,
        frequency: i < 4 ? 'vip' : i < 10 ? 'regular' : 'occasional'
      } as any));
    }

    // 5. Clear existing bookings
    console.log('Clearing existing bookings...');
    await prisma.bookingService.deleteMany({ where: { booking: { merchantId: merchant.id }}});
    await prisma.booking.deleteMany({ where: { merchantId: merchant.id }});

    // 6. Create realistic booking patterns
    console.log('Creating realistic booking patterns...');
    const now = new Date();
    const startDate = subDays(now, 60); // 2 months of history
    const endDate = addDays(now, 30); // 1 month future
    
    let totalBookings = 0;
    const bookingsByDay = new Map();

    // Categorize services by popularity
    const highPopServices = services.filter(s => 
      SERVICE_POPULARITY.high.some(name => s.name.toLowerCase().includes(name.toLowerCase()))
    );
    const mediumPopServices = services.filter(s => 
      SERVICE_POPULARITY.medium.some(name => s.name.toLowerCase().includes(name.toLowerCase()))
    );
    const lowPopServices = services.filter(s => 
      SERVICE_POPULARITY.low.some(name => s.name.toLowerCase().includes(name.toLowerCase()))
    );

    // Generate bookings day by day
    for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
      const dayOfWeek = d.getDay();
      const dateKey = d.toISOString().split('T')[0];
      
      // Realistic booking volume by day of week
      let baseBookings = 0;
      switch(dayOfWeek) {
        case 0: baseBookings = 0; break; // Sunday - closed
        case 1: baseBookings = 8; break;  // Monday - slow
        case 2: baseBookings = 12; break; // Tuesday
        case 3: baseBookings = 15; break; // Wednesday
        case 4: baseBookings = 18; break; // Thursday
        case 5: baseBookings = 22; break; // Friday - busy
        case 6: baseBookings = 25; break; // Saturday - busiest
      }

      // Add some randomness (±20%)
      const dayBookings = Math.floor(baseBookings * (0.8 + Math.random() * 0.4));
      bookingsByDay.set(dateKey, []);

      // Skip closed days
      if (dayBookings === 0) continue;

      // Generate time slots for the day
      const timeSlots = generateDayTimeSlots(dayOfWeek);
      
      for (let i = 0; i < dayBookings && i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        
        // Select customer based on frequency
        const customerPool = Math.random() < 0.5 
          ? customers.filter(c => c.frequency === 'vip' || c.frequency === 'regular')
          : customers;
        const customer = customerPool[Math.floor(Math.random() * customerPool.length)];
        
        // Select service based on popularity
        const serviceRand = Math.random();
        let service;
        if (serviceRand < 0.6 && highPopServices.length > 0) {
          service = highPopServices[Math.floor(Math.random() * highPopServices.length)];
        } else if (serviceRand < 0.9 && mediumPopServices.length > 0) {
          service = mediumPopServices[Math.floor(Math.random() * mediumPopServices.length)];
        } else if (lowPopServices.length > 0) {
          service = lowPopServices[Math.floor(Math.random() * lowPopServices.length)];
        } else {
          service = services[Math.floor(Math.random() * services.length)];
        }
        
        // Select staff (some staff work certain days/times)
        const availableStaff = staff.filter(s => {
          // Simulate staff schedules
          if (timeSlot.hour < 10 && Math.random() > 0.7) return false; // 30% work early
          if (timeSlot.hour > 17 && Math.random() > 0.5) return false; // 50% work late
          return true;
        });
        
        const selectedStaff = availableStaff[Math.floor(Math.random() * availableStaff.length)] || staff[0];
        
        // Set booking time
        const bookingTime = setMinutes(setHours(d, timeSlot.hour), timeSlot.minute);
        const endTime = new Date(bookingTime.getTime() + service.duration * 60000);
        
        // Determine status
        let status = 'CONFIRMED';
        if (d < now) {
          status = Math.random() < 0.85 ? 'COMPLETED' : 'CANCELLED';
        } else if (d.toDateString() === now.toDateString()) {
          const currentHour = now.getHours();
          if (timeSlot.hour < currentHour - 1) {
            status = 'COMPLETED';
          } else if (timeSlot.hour <= currentHour) {
            status = 'IN_PROGRESS';
          }
        }
        
        // Create booking
        const booking = await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            bookingNumber: `BK${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}${i.toString().padStart(3, '0')}`,
            status: status,
            startTime: bookingTime,
            endTime: endTime,
            totalAmount: service.price,
            depositAmount: status === 'CANCELLED' ? 0 : Number(service.price) * 0.2,
            source: Math.random() < 0.7 ? 'ONLINE' : 'PHONE',
            createdById: selectedStaff.id,
            providerId: selectedStaff.id,
            confirmedAt: status !== 'PENDING' ? bookingTime : undefined,
            completedAt: status === 'COMPLETED' ? endTime : undefined,
            cancelledAt: status === 'CANCELLED' ? bookingTime : undefined,
            notes: generateBookingNote(customer, service),
            services: {
              create: {
                serviceId: service.id,
                price: service.price,
                duration: service.duration,
                staffId: selectedStaff.id,
              }
            }
          }
        });
        
        totalBookings++;
        bookingsByDay.get(dateKey).push(booking);
      }
    }

    // 7. Summary statistics
    const stats = {
      totalCustomers: customers.length,
      vipCustomers: customers.filter(c => c.frequency === 'vip').length,
      regularCustomers: customers.filter(c => c.frequency === 'regular').length,
      occasionalCustomers: customers.filter(c => c.frequency === 'occasional').length,
      totalBookings: totalBookings,
      todayBookings: bookingsByDay.get(now.toISOString().split('T')[0])?.length || 0,
      averagePerDay: Math.round(totalBookings / 90),
    };

    console.log('\n✅ Successfully created realistic demo data!');
    console.log('📊 Statistics:');
    console.log(`   - Total Customers: ${stats.totalCustomers}`);
    console.log(`     • VIP: ${stats.vipCustomers} (${Math.round(stats.vipCustomers / stats.totalCustomers * 100)}%)`);
    console.log(`     • Regular: ${stats.regularCustomers} (${Math.round(stats.regularCustomers / stats.totalCustomers * 100)}%)`);
    console.log(`     • Occasional: ${stats.occasionalCustomers} (${Math.round(stats.occasionalCustomers / stats.totalCustomers * 100)}%)`);
    console.log(`   - Total Bookings: ${stats.totalBookings}`);
    console.log(`   - Today's Bookings: ${stats.todayBookings}`);
    console.log(`   - Average per Day: ${stats.averagePerDay}`);

  } catch (error) {
    console.error('Error creating realistic demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to generate realistic time slots
function generateDayTimeSlots(dayOfWeek: number) {
  const slots = [];
  
  // Different patterns for different days
  if (dayOfWeek === 6) { // Saturday - full day
    for (let hour = 9; hour <= 17; hour++) {
      slots.push({ hour, minute: 0 }, { hour, minute: 30 });
    }
  } else if (dayOfWeek === 5) { // Friday - extended hours
    for (let hour = 9; hour <= 19; hour++) {
      slots.push({ hour, minute: 0 }, { hour, minute: 30 });
    }
  } else { // Weekdays
    for (let hour = 9; hour <= 18; hour++) {
      slots.push({ hour, minute: 0 }, { hour, minute: 30 });
    }
  }
  
  // Shuffle and limit to create gaps (realistic booking pattern)
  return slots.sort(() => Math.random() - 0.5).slice(0, Math.floor(slots.length * 0.8));
}

// Helper function to generate realistic booking notes
function generateBookingNote(customer: any, service: any): string {
  const notes = [
    '',  // 60% no notes
    '', 
    '',
    'Prefers quiet room',
    'Allergic to lavender',
    'Running 10 mins late',
    'Birthday treat',
    'First time client',
    'Referred by friend',
    'Sensitive skin',
  ];
  
  if (customer.frequency === 'vip') {
    notes.push('VIP client - complimentary beverage');
  }
  
  return notes[Math.floor(Math.random() * notes.length)];
}

// Run the seed
seedRealisticDemo()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });