import { PrismaClient } from '@prisma/client';
import { addDays, setHours, setMinutes, startOfDay, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function seedBookingsOnly() {
  try {
    console.log('🌱 Creating bookings for existing merchant...');

    // Find the HAMILTON merchant
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' }
    });

    if (!merchant) {
      throw new Error('Hamilton Beauty Spa merchant not found. Run main seed first.');
    }

    // Get location, staff, and services separately
    const location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });

    if (!location) {
      throw new Error('No location found for merchant.');
    }

    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant.id }
    });

    const services = await prisma.service.findMany({
      where: { merchantId: merchant.id }
    });

    // Get existing customers
    const customers = await prisma.customer.findMany({
      where: { merchantId: merchant.id },
      take: 10
    });

    if (customers.length === 0) {
      throw new Error('No customers found. Run main seed first.');
    }

    // Create bookings for the past 30 days and next 30 days
    const bookings = [];
    const today = startOfDay(new Date());

    // Past bookings (30 days)
    for (let i = 30; i > 0; i--) {
      const date = subDays(today, i);
      const numBookings = Math.floor(Math.random() * 8) + 5; // 5-12 bookings per day

      for (let j = 0; j < numBookings; j++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        const hour = Math.floor(Math.random() * 9) + 9; // 9 AM to 5 PM
        const minute = Math.random() < 0.5 ? 0 : 30;
        const startTime = setMinutes(setHours(date, hour), minute);
        const endTime = new Date(startTime.getTime() + service.duration * 60000);

        const booking = await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            date: date,
            startTime: startTime,
            endTime: endTime,
            status: 'completed',
            totalAmount: service.price,
            depositAmount: 0,
            notes: '',
            source: 'admin',
            services: {
              create: {
                serviceId: service.id,
                staffId: staffMember.id,
                price: service.price,
                duration: service.duration
              }
            }
          }
        });

        // Create payment for completed bookings
        await prisma.payment.create({
          data: {
            merchant: { connect: { id: merchant.id } },
            booking: { connect: { id: booking.id } },
            amount: service.price,
            method: 'card',
            status: 'completed',
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          }
        });
      }
    }

    // Today's bookings
    const todayBookings = Math.floor(Math.random() * 6) + 8; // 8-13 bookings
    for (let j = 0; j < todayBookings; j++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const staffMember = staff[Math.floor(Math.random() * staff.length)];
      
      const hour = Math.floor(Math.random() * 9) + 9;
      const minute = Math.random() < 0.5 ? 0 : 30;
      const startTime = setMinutes(setHours(today, hour), minute);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      const status = j < 4 ? 'completed' : (j < 8 ? 'confirmed' : 'pending');

      await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          date: today,
          startTime: startTime,
          endTime: endTime,
          status: status,
          totalAmount: service.price,
          depositAmount: 0,
          notes: '',
          source: 'website',
          services: {
            create: {
              serviceId: service.id,
              staffId: staffMember.id,
              price: service.price,
              duration: service.duration,
              startTime: startTime,
              endTime: endTime,
            }
          }
        }
      });
    }

    // Future bookings (next 30 days)
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i);
      const numBookings = Math.floor(Math.random() * 6) + 3; // 3-8 bookings per day

      for (let j = 0; j < numBookings; j++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staffMember = staff[Math.floor(Math.random() * staff.length)];
        
        const hour = Math.floor(Math.random() * 9) + 9;
        const minute = Math.random() < 0.5 ? 0 : 30;
        const startTime = setMinutes(setHours(date, hour), minute);
        const endTime = new Date(startTime.getTime() + service.duration * 60000);

        await prisma.booking.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            customerId: customer.id,
            date: date,
            startTime: startTime,
            endTime: endTime,
            status: 'confirmed',
            totalAmount: service.price,
            depositAmount: service.price * 0.2, // 20% deposit
            notes: '',
            source: 'website',
            services: {
              create: {
                serviceId: service.id,
                staffId: staffMember.id,
                price: service.price,
                duration: service.duration
              }
            }
          }
        });
      }
    }

    const totalBookings = await prisma.booking.count({
      where: { merchantId: merchant.id }
    });

    console.log(`✅ Successfully created bookings for Hamilton Beauty Spa`);
    console.log(`   Total bookings: ${totalBookings}`);
    console.log(`   Past bookings (completed): ~${30 * 8}`);
    console.log(`   Today's bookings: ${todayBookings}`);
    console.log(`   Future bookings (confirmed): ~${30 * 5}`);

  } catch (error) {
    console.error('Error seeding bookings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedBookingsOnly()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });