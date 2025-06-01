import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to generate time slots
function generateTimeSlot(date: Date, hour: number, minute: number = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Helper to add days
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate random phone
function generatePhone(): string {
  const prefix = ['0412', '0423', '0434', '0445', '0456'];
  return prefix[Math.floor(Math.random() * prefix.length)] + 
         Math.floor(Math.random() * 9000000 + 1000000).toString();
}

// First and last names for customer generation
const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

// Booking statuses
const statuses = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'IN_PROGRESS'];
const futureStatuses = ['CONFIRMED', 'PENDING'];
const pastStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

async function main() {
  console.log('🚀 Generating busy week bookings...');

  // Get merchant data
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: 'hamilton' }
  });

  if (!merchant) {
    console.error('❌ Hamilton merchant not found');
    return;
  }

  // Get all staff, services, and existing customers
  const staff = await prisma.staff.findMany({
    where: { merchantId: merchant.id }
  });

  const services = await prisma.service.findMany({
    where: { merchantId: merchant.id }
  });

  let customers = await prisma.customer.findMany({
    where: { merchantId: merchant.id }
  });

  const location = await prisma.location.findFirst({
    where: { merchantId: merchant.id }
  });

  if (!location) {
    console.error('❌ No location found');
    return;
  }

  console.log(`✅ Found ${staff.length} staff, ${services.length} services, ${customers.length} customers`);

  // Create more customers if needed
  const customersNeeded = 30 - customers.length;
  if (customersNeeded > 0) {
    console.log(`📝 Creating ${customersNeeded} additional customers...`);
    
    for (let i = 0; i < customersNeeded; i++) {
      const firstName = getRandomItem(firstNames);
      const lastName = getRandomItem(lastNames);
      
      const customer = await prisma.customer.create({
        data: {
          merchantId: merchant.id,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
          mobile: generatePhone(),
          gender: Math.random() > 0.5 ? 'FEMALE' : 'MALE',
          marketingConsent: Math.random() > 0.3,
          notes: '',
          tags: JSON.stringify([])
        }
      });
      
      customers.push(customer);
    }
  }

  // Define time slots for bookings (9 AM to 7 PM, every 30 minutes)
  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    timeSlots.push({ hour, minute: 0 });
    timeSlots.push({ hour, minute: 30 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate bookings for each day
  const bookingsToCreate = [];
  let totalBookings = 0;

  // Last week (7 days ago to 1 day ago)
  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const date = addDays(today, -daysAgo);
    const dayOfWeek = date.getDay();
    
    // Determine density based on day of week
    const density = dayOfWeek === 0 ? 0.5 : // Sunday - 50%
                    dayOfWeek === 6 ? 0.8 : // Saturday - 80%
                    0.7; // Weekdays - 70%
    
    const slotsToFill = Math.floor(timeSlots.length * staff.length * density);
    
    for (let i = 0; i < slotsToFill; i++) {
      const slot = getRandomItem(timeSlots);
      const selectedStaff = getRandomItem(staff);
      const selectedService = getRandomItem(services);
      const selectedCustomer = getRandomItem(customers);
      
      const startTime = generateTimeSlot(date, slot.hour, slot.minute);
      const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);
      
      bookingsToCreate.push({
        merchantId: merchant.id,
        locationId: location.id,
        customerId: selectedCustomer.id,
        staffId: selectedStaff.id,
        startTime,
        endTime,
        status: getRandomItem(pastStatuses),
        services: {
          create: [{
            serviceId: selectedService.id,
            staffId: selectedStaff.id,
            price: selectedService.price,
            duration: selectedService.duration
          }]
        },
        totalAmount: selectedService.price,
        notes: Math.random() > 0.7 ? 'Regular customer' : ''
      });
      
      totalBookings++;
    }
  }

  // This week (today to 6 days from now)
  for (let daysFromNow = 0; daysFromNow <= 6; daysFromNow++) {
    const date = addDays(today, daysFromNow);
    const dayOfWeek = date.getDay();
    
    // Today and tomorrow are extra busy
    const density = daysFromNow === 0 ? 0.9 : // Today - 90%
                    daysFromNow === 1 ? 0.85 : // Tomorrow - 85%
                    dayOfWeek === 0 ? 0.6 : // Sunday - 60%
                    dayOfWeek === 6 ? 0.85 : // Saturday - 85%
                    0.75; // Other weekdays - 75%
    
    const slotsToFill = Math.floor(timeSlots.length * staff.length * density);
    
    for (let i = 0; i < slotsToFill; i++) {
      const slot = getRandomItem(timeSlots);
      const selectedStaff = getRandomItem(staff);
      const selectedService = getRandomItem(services);
      const selectedCustomer = getRandomItem(customers);
      
      const startTime = generateTimeSlot(date, slot.hour, slot.minute);
      const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);
      
      // Determine status based on time
      let status: string;
      if (daysFromNow === 0 && slot.hour < new Date().getHours()) {
        status = 'COMPLETED';
      } else if (daysFromNow === 0 && slot.hour === new Date().getHours()) {
        status = 'IN_PROGRESS';
      } else {
        status = getRandomItem(futureStatuses);
      }
      
      bookingsToCreate.push({
        merchantId: merchant.id,
        locationId: location.id,
        customerId: selectedCustomer.id,
        staffId: selectedStaff.id,
        startTime,
        endTime,
        status,
        services: {
          create: [{
            serviceId: selectedService.id,
            staffId: selectedStaff.id,
            price: selectedService.price,
            duration: selectedService.duration
          }]
        },
        totalAmount: selectedService.price,
        notes: Math.random() > 0.8 ? 'Preferred time slot' : ''
      });
      
      totalBookings++;
    }
  }

  // Next week (7 to 14 days from now) - lighter schedule
  for (let daysFromNow = 7; daysFromNow <= 14; daysFromNow++) {
    const date = addDays(today, daysFromNow);
    const dayOfWeek = date.getDay();
    
    const density = dayOfWeek === 0 ? 0.4 : // Sunday - 40%
                    dayOfWeek === 6 ? 0.7 : // Saturday - 70%
                    0.6; // Weekdays - 60%
    
    const slotsToFill = Math.floor(timeSlots.length * staff.length * density);
    
    for (let i = 0; i < slotsToFill; i++) {
      const slot = getRandomItem(timeSlots);
      const selectedStaff = getRandomItem(staff);
      const selectedService = getRandomItem(services);
      const selectedCustomer = getRandomItem(customers);
      
      const startTime = generateTimeSlot(date, slot.hour, slot.minute);
      const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);
      
      bookingsToCreate.push({
        merchantId: merchant.id,
        locationId: location.id,
        customerId: selectedCustomer.id,
        staffId: selectedStaff.id,
        startTime,
        endTime,
        status: getRandomItem(futureStatuses),
        services: {
          create: [{
            serviceId: selectedService.id,
            staffId: selectedStaff.id,
            price: selectedService.price,
            duration: selectedService.duration
          }]
        },
        totalAmount: selectedService.price,
        notes: ''
      });
      
      totalBookings++;
    }
  }

  // Create all bookings
  console.log(`📅 Creating ${totalBookings} bookings...`);
  
  let created = 0;
  for (const booking of bookingsToCreate) {
    try {
      await prisma.booking.create({
        data: booking
      });
      created++;
      
      if (created % 50 === 0) {
        console.log(`   Created ${created}/${totalBookings} bookings...`);
      }
    } catch (error) {
      // Skip if there's a conflict
    }
  }

  console.log(`\n✅ Successfully created ${created} bookings!`);
  
  // Show summary
  const summary = await prisma.booking.groupBy({
    by: ['status'],
    where: { merchantId: merchant.id },
    _count: true
  });
  
  console.log('\n📊 Booking Summary:');
  summary.forEach(s => {
    console.log(`   ${s.status}: ${s._count}`);
  });
  
  // Show daily counts
  const startDate = addDays(today, -7);
  const endDate = addDays(today, 14);
  
  const dailyCounts = await prisma.booking.groupBy({
    by: ['startTime'],
    where: {
      merchantId: merchant.id,
      startTime: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: true
  });
  
  console.log('\n📅 Daily booking counts:');
  for (let d = -7; d <= 14; d++) {
    const date = addDays(today, d);
    const dateStr = date.toDateString();
    const count = dailyCounts.filter(dc => {
      const bookingDate = new Date(dc.startTime);
      return bookingDate.toDateString() === dateStr;
    }).reduce((sum, dc) => sum + dc._count, 0);
    
    const label = d === 0 ? ' (TODAY)' : d === -7 ? ' (Last Week)' : d === 7 ? ' (Next Week)' : '';
    console.log(`   ${dateStr}${label}: ${count} bookings`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });