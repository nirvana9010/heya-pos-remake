import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Australian phone number generator
function generateAustralianPhone() {
  const prefixes = ['0421', '0422', '0423', '0431', '0432', '0433', '0411', '0412', '0413'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix} ${number}`;
}

// Common Australian names
const australianFirstNames = [
  'Emma', 'Olivia', 'Charlotte', 'Amelia', 'Ava', 'Chloe', 'Grace', 'Sophie', 'Zoe', 'Lily',
  'Jack', 'Oliver', 'William', 'Noah', 'Thomas', 'James', 'Lucas', 'Henry', 'Ethan', 'Mason',
  'Sarah', 'Jessica', 'Emily', 'Hannah', 'Madison', 'Ashley', 'Taylor', 'Alexis', 'Samantha', 'Megan',
  'Michael', 'Daniel', 'Matthew', 'Joshua', 'Andrew', 'Ryan', 'Nathan', 'Samuel', 'Benjamin', 'Jacob'
];

const australianLastNames = [
  'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson',
  'Thompson', 'Nguyen', 'Thomas', 'Walker', 'Harris', 'Lee', 'Ryan', 'Robinson', 'Kelly', 'King',
  'Davis', 'Edwards', 'Turner', 'Mitchell', 'Collins', 'Campbell', 'Evans', 'Roberts', 'Clarke', 'Scott'
];

async function seedDemoData() {
  console.log('🌱 Starting demo data seed...\n');

  try {
    // Get the Hamilton Beauty Spa merchant
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' }
    });

    if (!merchant) {
      throw new Error('Hamilton Beauty Spa merchant not found. Please run the main seed first.');
    }

    const location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });

    if (!location) {
      throw new Error('Location not found for Hamilton Beauty Spa');
    }

    // Get existing staff and services
    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant.id }
    });

    const services = await prisma.service.findMany({
      where: { merchantId: merchant.id }
    });

    console.log(`Found ${staff.length} staff members and ${services.length} services\n`);

    // 1. Create more customers
    console.log('📝 Creating customers...');
    const customers = [];
    const targetCustomerCount = 75;

    // Check existing customers
    const existingCustomers = await prisma.customer.findMany({
      where: { merchantId: merchant.id }
    });
    console.log(`Found ${existingCustomers.length} existing customers`);

    const customersToCreate = targetCustomerCount - existingCustomers.length;

    for (let i = 0; i < customersToCreate; i++) {
      const firstName = australianFirstNames[Math.floor(Math.random() * australianFirstNames.length)];
      const lastName = australianLastNames[Math.floor(Math.random() * australianLastNames.length)];
      const email = faker.internet.email({ firstName, lastName }).toLowerCase();

      const customer = await prisma.customer.create({
        data: {
          merchantId: merchant.id,
          firstName,
          lastName,
          email,
          phone: Math.random() > 0.2 ? generateAustralianPhone() : null,
          notes: Math.random() > 0.8 ? faker.lorem.sentence() : null,
          tags: generateCustomerTags(),
          source: ['WALK_IN', 'ONLINE', 'PHONE', 'REFERRAL'][Math.floor(Math.random() * 4)],
        }
      });
      customers.push(customer);
    }

    // Combine with existing customers
    const allCustomers = [...existingCustomers, ...customers];
    console.log(`✅ Created ${customers.length} new customers (Total: ${allCustomers.length})\n`);

    // 2. Create bookings
    console.log('📅 Creating bookings...');
    await createRealisticBookings(merchant.id, location.id, allCustomers, staff, services);

    console.log('\n✅ Demo data seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateCustomerTags() {
  const allTags = ['VIP', 'Regular', 'New', 'Birthday Month', 'Preferred', 'Sensitive Skin', 'Premium'];
  const numTags = Math.floor(Math.random() * 3);
  const tags = [];
  
  for (let i = 0; i < numTags; i++) {
    const tag = allTags[Math.floor(Math.random() * allTags.length)];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

async function createRealisticBookings(
  merchantId: string,
  locationId: string,
  customers: any[],
  staff: any[],
  services: any[]
) {
  const bookings = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Distribution of bookings
  const pastDays = 30;  // 30 days of past bookings
  const futureDays = 14; // 14 days of future bookings

  // Track staff schedules to prevent double booking
  const staffSchedules: { [key: string]: { [date: string]: Array<{ start: Date, end: Date }> } } = {};
  staff.forEach(s => {
    staffSchedules[s.id] = {};
  });

  // Generate bookings for each day
  for (let dayOffset = -pastDays; dayOffset <= futureDays; dayOffset++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);
    
    // Skip Sundays
    if (currentDate.getDay() === 0) continue;

    // Determine number of bookings for this day
    const isWeekend = currentDate.getDay() === 6;
    const isPast = dayOffset < 0;
    const isToday = dayOffset === 0;
    
    let bookingsToday;
    if (isWeekend) {
      bookingsToday = 12 + Math.floor(Math.random() * 8); // 12-20 bookings on Saturday
    } else if (isToday) {
      bookingsToday = 8 + Math.floor(Math.random() * 4); // 8-12 bookings today
    } else {
      bookingsToday = 6 + Math.floor(Math.random() * 6); // 6-12 bookings on weekdays
    }

    // Initialize staff schedules for this day
    const dateKey = currentDate.toISOString().split('T')[0];
    staff.forEach(s => {
      staffSchedules[s.id][dateKey] = [];
    });

    for (let i = 0; i < bookingsToday; i++) {
      // Select random customer, service, and available staff
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      
      // Find available staff for this time
      const hour = 9 + Math.floor(Math.random() * 9); // 9am to 5pm
      const minute = Math.random() < 0.5 ? 0 : 30;
      
      const startTime = new Date(currentDate);
      startTime.setHours(hour, minute, 0, 0);
      
      const duration = Number(service.duration);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Find available staff
      const availableStaff = staff.filter(staffMember => {
        const schedule = staffSchedules[staffMember.id][dateKey];
        return !schedule.some(booking => 
          (startTime >= booking.start && startTime < booking.end) ||
          (endTime > booking.start && endTime <= booking.end)
        );
      });

      if (availableStaff.length === 0) continue;

      const selectedStaff = availableStaff[Math.floor(Math.random() * availableStaff.length)];

      // Add to staff schedule
      staffSchedules[selectedStaff.id][dateKey].push({ start: startTime, end: endTime });

      // Determine status based on date
      let status;
      if (isPast) {
        status = Math.random() < 0.85 ? 'COMPLETED' : 'CANCELLED';
      } else if (isToday) {
        const now = new Date();
        if (startTime < now) {
          status = Math.random() < 0.7 ? 'COMPLETED' : 'IN_PROGRESS';
        } else {
          status = 'CONFIRMED';
        }
      } else {
        status = Math.random() < 0.9 ? 'CONFIRMED' : 'PENDING';
      }

      const booking = {
        merchantId,
        locationId,
        customerId: customer.id,
        bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase(),
        status,
        startTime,
        endTime,
        totalAmount: Number(service.price),
        depositAmount: Number(service.depositAmount) || 0,
        source: ['ONLINE', 'WALK_IN', 'PHONE'][Math.floor(Math.random() * 3)],
        notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        createdById: staff[0].id, // Admin who created it
        providerId: selectedStaff.id,
        services: {
          create: {
            serviceId: service.id,
            price: Number(service.price),
            duration: Number(service.duration),
            staffId: selectedStaff.id,
          }
        }
      };

      bookings.push(booking);
    }
  }

  // Create bookings in batches
  console.log(`Creating ${bookings.length} bookings...`);
  let created = 0;
  
  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
    created++;
    
    if (created % 50 === 0) {
      console.log(`  Created ${created}/${bookings.length} bookings...`);
    }
  }

  console.log(`✅ Created ${created} bookings`);

  // Print summary
  const summary = await prisma.booking.groupBy({
    by: ['status'],
    where: { merchantId },
    _count: true
  });

  console.log('\n📊 Booking Summary:');
  summary.forEach(s => {
    console.log(`  ${s.status}: ${s._count}`);
  });
}

// Run the seed
seedDemoData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });