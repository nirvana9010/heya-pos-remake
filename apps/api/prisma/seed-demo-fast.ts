import { PrismaClient } from '@prisma/client';
import { addDays, subDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

// Quick demo data with good variety
const DEMO_CUSTOMERS = [
  // VIP customers (come often)
  { name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+61 400 111 222', visits: 45 },
  { name: 'Emily Chen', email: 'emily.c@email.com', phone: '+61 400 222 333', visits: 38 },
  { name: 'Jessica Williams', email: 'jess.w@email.com', phone: '+61 400 333 444', visits: 42 },
  
  // Regular customers (monthly)
  { name: 'Amanda Taylor', email: 'amanda.t@email.com', phone: '+61 401 111 222', visits: 12 },
  { name: 'Michelle Brown', email: 'michelle.b@email.com', phone: '+61 401 222 333', visits: 15 },
  { name: 'Nicole Davis', email: 'nicole.d@email.com', phone: '+61 401 333 444', visits: 18 },
  { name: 'Rachel Miller', email: 'rachel.m@email.com', phone: '+61 401 444 555', visits: 14 },
  { name: 'Sophia Wilson', email: 'sophia.w@email.com', phone: '+61 401 555 666', visits: 16 },
  
  // Occasional customers
  { name: 'Hannah Thompson', email: 'hannah.t@email.com', phone: '+61 402 111 222', visits: 4 },
  { name: 'Olivia Garcia', email: 'olivia.g@email.com', phone: '+61 402 222 333', visits: 3 },
  { name: 'Emma Martinez', email: 'emma.m@email.com', phone: '+61 402 333 444', visits: 5 },
  { name: 'Ava Robinson', email: 'ava.r@email.com', phone: '+61 402 444 555', visits: 2 },
];

async function seedDemoFast() {
  console.log('🚀 Creating demo data (fast version)...');
  
  try {
    // 1. Get merchant and required data
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' }
    });
    if (!merchant) throw new Error('Merchant not found');

    const [location, staff, services] = await Promise.all([
      prisma.location.findFirst({ where: { merchantId: merchant.id }}),
      prisma.staff.findMany({ where: { merchantId: merchant.id }}),
      prisma.service.findMany({ where: { merchantId: merchant.id }})
    ]);

    // 2. Create customers quickly
    console.log('Creating customers...');
    const customers = await Promise.all(
      DEMO_CUSTOMERS.map(async (cust) => {
        const [firstName, lastName] = cust.name.split(' ');
        // Check if customer exists by email or phone
        const existing = await prisma.customer.findFirst({
          where: { 
            merchantId: merchant.id,
            OR: [
              { email: cust.email },
              { mobile: cust.phone }
            ]
          }
        });
        
        if (existing) return existing;
        
        return await prisma.customer.create({
          data: {
            merchantId: merchant.id,
            email: cust.email,
            firstName,
            lastName,
            phone: cust.phone,
            mobile: cust.phone,
            gender: 'FEMALE',
            marketingConsent: true,
            visitCount: cust.visits,
            totalSpent: cust.visits * 120,
          }
        });
      })
    );

    // 3. Clear existing bookings
    console.log('Clearing old bookings...');
    await prisma.bookingService.deleteMany({ where: { booking: { merchantId: merchant.id }}});
    await prisma.booking.deleteMany({ where: { merchantId: merchant.id }});

    // 4. Create bookings for last 30 days and next 14 days
    console.log('Creating bookings...');
    const now = new Date();
    const bookingPromises = [];
    
    // Past 30 days - varying patterns
    for (let day = -30; day <= 14; day++) {
      const date = day === 0 ? now : (day < 0 ? subDays(now, Math.abs(day)) : addDays(now, day));
      const dayOfWeek = date.getDay();
      
      // Skip Sundays
      if (dayOfWeek === 0) continue;
      
      // Different volume by day
      let numBookings = dayOfWeek === 6 ? 18 : dayOfWeek === 5 ? 15 : 10;
      numBookings = Math.floor(numBookings * (0.7 + Math.random() * 0.6));
      
      for (let i = 0; i < numBookings; i++) {
        const hour = 9 + Math.floor(Math.random() * 9);
        const minute = Math.random() < 0.5 ? 0 : 30;
        const startTime = setMinutes(setHours(date, hour), minute);
        
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        // Status logic
        let status = 'CONFIRMED';
        if (day < -1) {
          status = Math.random() < 0.9 ? 'COMPLETED' : 'CANCELLED';
        } else if (day === 0) {
          if (hour < now.getHours()) {
            status = 'COMPLETED';
          } else if (hour === now.getHours()) {
            status = 'IN_PROGRESS';
          }
        }
        
        const booking = prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            bookingNumber: `BK${Date.now()}${i}${Math.random().toString(36).substring(2, 4)}`.toUpperCase(),
            status: status,
            startTime: startTime,
            endTime: new Date(startTime.getTime() + service.duration * 60000),
            totalAmount: service.price,
            depositAmount: status === 'CANCELLED' ? 0 : Number(service.price) * 0.2,
            source: 'ONLINE',
            createdById: staffMember.id,
            providerId: staffMember.id,
            confirmedAt: status !== 'PENDING' ? startTime : undefined,
            completedAt: status === 'COMPLETED' ? new Date(startTime.getTime() + service.duration * 60000) : undefined,
            cancelledAt: status === 'CANCELLED' ? startTime : undefined,
            services: {
              create: {
                serviceId: service.id,
                price: service.price,
                duration: service.duration,
                staffId: staffMember.id,
              }
            }
          }
        });
        
        bookingPromises.push(booking);
      }
    }
    
    // Execute all bookings in parallel batches
    console.log(`Creating ${bookingPromises.length} bookings in batches...`);
    const batchSize = 50;
    for (let i = 0; i < bookingPromises.length; i += batchSize) {
      const batch = bookingPromises.slice(i, i + batchSize);
      await Promise.all(batch);
      console.log(`Progress: ${Math.min(i + batchSize, bookingPromises.length)}/${bookingPromises.length}`);
    }

    // 5. Final stats
    const [totalCustomers, totalBookings, todayBookings] = await Promise.all([
      prisma.customer.count({ where: { merchantId: merchant.id }}),
      prisma.booking.count({ where: { merchantId: merchant.id }}),
      prisma.booking.count({ 
        where: { 
          merchantId: merchant.id,
          startTime: {
            gte: new Date(now.toISOString().split('T')[0]),
            lt: addDays(new Date(now.toISOString().split('T')[0]), 1)
          }
        }
      })
    ]);

    console.log('\n✅ Demo data created successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Customers: ${totalCustomers} (${DEMO_CUSTOMERS.length} new)`);
    console.log(`   - Total Bookings: ${totalBookings}`);
    console.log(`   - Today's Bookings: ${todayBookings}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoFast().catch(console.error);