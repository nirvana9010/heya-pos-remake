import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPastBookings() {
  console.log('🌱 Adding past bookings with various statuses...\n');

  try {
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' }
    });

    if (!merchant) {
      throw new Error('Hamilton Beauty Spa merchant not found');
    }

    const location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });

    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant.id }
    });

    const services = await prisma.service.findMany({
      where: { merchantId: merchant.id }
    });

    const customers = await prisma.customer.findMany({
      where: { merchantId: merchant.id }
    });

    console.log(`Using ${customers.length} customers, ${staff.length} staff, ${services.length} services\n`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add bookings for past 14 days
    for (let dayOffset = -14; dayOffset <= -1; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      // Skip Sundays
      if (currentDate.getDay() === 0) continue;

      const isWeekend = currentDate.getDay() === 6;
      const bookingsPerDay = isWeekend ? 15 + Math.floor(Math.random() * 5) : 8 + Math.floor(Math.random() * 4);

      for (let i = 0; i < bookingsPerDay; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        const hour = 9 + Math.floor(Math.random() * 8);
        const minute = Math.random() < 0.5 ? 0 : 30;
        
        const startTime = new Date(currentDate);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime.getTime() + Number(service.duration) * 60000);

        // Past bookings should mostly be completed
        const statusRandom = Math.random();
        let status;
        if (statusRandom < 0.8) {
          status = 'COMPLETED';
        } else if (statusRandom < 0.9) {
          status = 'CANCELLED';
        } else {
          status = 'NO_SHOW';
        }

        const booking = await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
            status,
            startTime,
            endTime,
            totalAmount: Number(service.price),
            depositAmount: Number(service.depositAmount) || 0,
            source: ['ONLINE', 'WALK_IN', 'PHONE'][Math.floor(Math.random() * 3)],
            createdById: staff[0].id,
            providerId: staffMember.id,
            services: {
              create: {
                serviceId: service.id,
                price: Number(service.price),
                duration: Number(service.duration),
                staffId: staffMember.id,
              }
            }
          }
        });
      }

      console.log(`✅ Created ${bookingsPerDay} bookings for ${currentDate.toLocaleDateString()}`);
    }

    // Add today's bookings with mixed statuses
    console.log('\n📅 Adding today\'s bookings...');
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const staffMember = staff[Math.floor(Math.random() * staff.length)];
      
      const hour = 9 + Math.floor(Math.random() * 10);
      const minute = Math.random() < 0.5 ? 0 : 30;
      
      const startTime = new Date(today);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime.getTime() + Number(service.duration) * 60000);

      // Determine status based on current time
      let status;
      if (endTime < now) {
        status = Math.random() < 0.9 ? 'COMPLETED' : 'NO_SHOW';
      } else if (startTime < now) {
        status = 'IN_PROGRESS';
      } else {
        status = Math.random() < 0.8 ? 'CONFIRMED' : 'PENDING';
      }

      await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
          status,
          startTime,
          endTime,
          totalAmount: Number(service.price),
          depositAmount: Number(service.depositAmount) || 0,
          source: ['ONLINE', 'WALK_IN'][Math.floor(Math.random() * 2)],
          createdById: staff[0].id,
          providerId: staffMember.id,
          services: {
            create: {
              serviceId: service.id,
              price: Number(service.price),
              duration: Number(service.duration),
              staffId: staffMember.id,
            }
          }
        }
      });
    }

    console.log(`✅ Created 12 bookings for today`);

    // Get summary
    const summary = await prisma.booking.groupBy({
      by: ['status'],
      where: { merchantId: merchant.id },
      _count: true
    });

    const totalBookings = await prisma.booking.count({
      where: { merchantId: merchant.id }
    });

    console.log(`\n📊 Booking Summary:`);
    summary.forEach(s => {
      console.log(`  ${s.status}: ${s._count}`);
    });
    console.log(`\n✅ Total bookings in system: ${totalBookings}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPastBookings();