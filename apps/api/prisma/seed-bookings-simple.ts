import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBookings() {
  try {
    console.log('🌱 Creating bookings for Hamilton Beauty Spa...');

    // Find the merchant
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' }
    });

    if (!merchant) {
      throw new Error('Hamilton Beauty Spa not found');
    }

    // Get location
    const location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });

    if (!location) {
      throw new Error('No location found');
    }

    // Get staff and services
    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant.id }
    });
    
    const services = await prisma.service.findMany({
      where: { merchantId: merchant.id }
    });
    
    const customers = await prisma.customer.findMany({
      where: { merchantId: merchant.id },
      take: 20
    });

    if (staff.length === 0 || services.length === 0 || customers.length === 0) {
      throw new Error('No staff, services, or customers found');
    }

    const now = new Date();
    let createdCount = 0;

    // Create past bookings (last 30 days)
    for (let i = 30; i > 0; i--) {
      const numBookings = Math.floor(Math.random() * 6) + 4; // 4-9 per day
      
      for (let j = 0; j < numBookings; j++) {
        const bookingDate = new Date(now);
        bookingDate.setDate(bookingDate.getDate() - i);
        bookingDate.setHours(9 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0);
        
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
            status: 'COMPLETED',
            startTime: bookingDate,
            endTime: new Date(bookingDate.getTime() + service.duration * 60000),
            totalAmount: service.price,
            depositAmount: 0,
            source: 'ONLINE',
            createdById: staffMember.id,
            providerId: staffMember.id,
            completedAt: new Date(bookingDate.getTime() + service.duration * 60000),
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
        createdCount++;
      }
    }

    // Create today's bookings
    const todayNum = 8;
    for (let j = 0; j < todayNum; j++) {
      const bookingDate = new Date(now);
      bookingDate.setHours(9 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0);
      
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const staffMember = staff[Math.floor(Math.random() * staff.length)];
      
      const isCompleted = j < 3;
      const isInProgress = j === 3;
      
      await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
          status: isCompleted ? 'COMPLETED' : (isInProgress ? 'IN_PROGRESS' : 'CONFIRMED'),
          startTime: bookingDate,
          endTime: new Date(bookingDate.getTime() + service.duration * 60000),
          totalAmount: service.price,
          depositAmount: Number(service.price) * 0.2,
          source: 'ONLINE',
          createdById: staffMember.id,
          providerId: staffMember.id,
          confirmedAt: isCompleted || isInProgress ? bookingDate : undefined,
          checkedInAt: isInProgress ? bookingDate : undefined,
          completedAt: isCompleted ? new Date(bookingDate.getTime() + service.duration * 60000) : undefined,
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
      createdCount++;
    }

    // Create future bookings
    for (let i = 1; i <= 14; i++) {
      const numBookings = Math.floor(Math.random() * 4) + 2; // 2-5 per day
      
      for (let j = 0; j < numBookings; j++) {
        const bookingDate = new Date(now);
        bookingDate.setDate(bookingDate.getDate() + i);
        bookingDate.setHours(9 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0);
        
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
            status: 'CONFIRMED',
            startTime: bookingDate,
            endTime: new Date(bookingDate.getTime() + service.duration * 60000),
            totalAmount: service.price,
            depositAmount: Number(service.price) * 0.2,
            source: 'ONLINE',
            createdById: staffMember.id,
            providerId: staffMember.id,
            confirmedAt: new Date(),
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
        createdCount++;
      }
    }

    console.log(`✅ Successfully created ${createdCount} bookings for Hamilton Beauty Spa`);
    console.log(`   - Past bookings: ~${30 * 6}`);
    console.log(`   - Today's bookings: ${todayNum}`);
    console.log(`   - Future bookings: ~${14 * 3}`);

  } catch (error) {
    console.error('Error seeding bookings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedBookings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });