import { PrismaClient } from '@prisma/client';
import { addDays, addHours, startOfToday } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating bookings for Hamilton Beauty Spa...');

  // Find first merchant
  const merchant = await prisma.merchant.findFirst();

  if (!merchant) {
    throw new Error('No merchant found in database');
  }

  console.log(`Found merchant: ${merchant.name} (${merchant.id})`);

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

  if (!location || staff.length === 0 || services.length === 0 || customers.length === 0) {
    throw new Error('Missing required data for creating bookings');
  }

  const today = startOfToday();
  const bookings = [];

  // Create bookings for today
  for (let i = 0; i < 3; i++) {
    const customer = customers[i % customers.length];
    const service = services[i % services.length];
    const staffMember = staff[i % staff.length];
    const startTime = addHours(today, 9 + i * 2);
    const endTime = addHours(startTime, service.duration / 60);

    bookings.push({
      merchantId: merchant.id,
      locationId: location.id,
      customerId: customer.id,
      providerId: staffMember.id,
      bookingNumber: `BK${Date.now()}${i}`,
      status: i === 0 ? 'COMPLETED' : 'CONFIRMED',
      startTime,
      endTime,
      totalAmount: service.price,
      depositAmount: 0,
      source: 'MANUAL',
      createdById: staffMember.id,
      notes: `${service.name} with ${staffMember.firstName}`,
    });
  }

  // Create bookings for tomorrow
  for (let i = 0; i < 4; i++) {
    const customer = customers[(i + 3) % customers.length];
    const service = services[(i + 1) % services.length];
    const staffMember = staff[(i + 1) % staff.length];
    const startTime = addHours(addDays(today, 1), 10 + i * 1.5);
    const endTime = addHours(startTime, service.duration / 60);

    bookings.push({
      merchantId: merchant.id,
      locationId: location.id,
      customerId: customer.id,
      providerId: staffMember.id,
      bookingNumber: `BK${Date.now()}${i + 3}`,
      status: 'CONFIRMED',
      startTime,
      endTime,
      totalAmount: service.price,
      depositAmount: 0,
      source: 'ONLINE',
      createdById: staffMember.id,
      notes: `${service.name} appointment`,
    });
  }

  // Create bookings for next week
  for (let i = 0; i < 5; i++) {
    const customer = customers[(i + 7) % customers.length];
    const service = services[(i + 2) % services.length];
    const staffMember = staff[i % staff.length];
    const startTime = addHours(addDays(today, 7 + i), 11 + i);
    const endTime = addHours(startTime, service.duration / 60);

    bookings.push({
      merchantId: merchant.id,
      locationId: location.id,
      customerId: customer.id,
      providerId: staffMember.id,
      bookingNumber: `BK${Date.now()}${i + 7}`,
      status: 'PENDING',
      startTime,
      endTime,
      totalAmount: service.price,
      depositAmount: 0,
      source: 'PHONE',
      createdById: staffMember.id,
    });
  }

  // Create all bookings
  for (const booking of bookings) {
    const created = await prisma.booking.create({
      data: booking,
    });

    // Add booking service
    await prisma.bookingService.create({
      data: {
        bookingId: created.id,
        serviceId: services.find(s => s.price.equals(booking.totalAmount))?.id || services[0].id,
        price: booking.totalAmount,
        duration: 60,
        staffId: booking.providerId,
      },
    });
  }

  console.log(`✅ Created ${bookings.length} bookings for Hamilton Beauty Spa`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });