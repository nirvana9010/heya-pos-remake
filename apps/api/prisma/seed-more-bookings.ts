import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMoreBookings() {
  console.log('🌱 Adding more bookings to existing data...\n');

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
      where: { merchantId: merchant.id },
      take: 50 // Use first 50 customers
    });

    console.log(`Using ${customers.length} customers, ${staff.length} staff, ${services.length} services\n`);

    const bookings = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add bookings for next 7 days
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      // Skip Sundays
      if (currentDate.getDay() === 0) continue;

      const bookingsPerDay = 10 + Math.floor(Math.random() * 5);

      for (let i = 0; i < bookingsPerDay; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        const hour = 9 + Math.floor(Math.random() * 8);
        const minute = Math.random() < 0.5 ? 0 : 30;
        
        const startTime = new Date(currentDate);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime.getTime() + Number(service.duration) * 60000);

        const booking = await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
            status: 'CONFIRMED',
            startTime,
            endTime,
            totalAmount: Number(service.price),
            depositAmount: Number(service.depositAmount) || 0,
            source: 'ONLINE',
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

    // Get final count
    const totalBookings = await prisma.booking.count({
      where: { merchantId: merchant.id }
    });

    console.log(`\n✅ Done! Total bookings in system: ${totalBookings}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMoreBookings();