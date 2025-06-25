import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding bookings for today...');

  try {
    // Get Hamilton merchant
    const merchantAuth = await prisma.merchantAuth.findFirst({
      where: { username: 'HAMILTON' }
    });

    if (!merchantAuth) {
      console.error('❌ Merchant auth for HAMILTON not found');
      return;
    }

    const merchant = await prisma.merchant.findFirst({
      where: { id: merchantAuth.merchantId }
    });

    if (!merchant) {
      console.error('❌ Merchant HAMILTON not found');
      return;
    }

    // Get related data
    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant.id }
    });
    
    const services = await prisma.service.findMany({
      where: { merchantId: merchant.id, isActive: true }
    });
    
    const customers = await prisma.customer.findMany({
      where: { merchantId: merchant.id },
      take: 5
    });
    
    const locations = await prisma.location.findMany({
      where: { merchantId: merchant.id, isActive: true }
    });

    console.log(`✅ Found merchant: ${merchant.name}`);
    console.log(`   Staff: ${staff.length}`);
    console.log(`   Services: ${services.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Locations: ${locations.length}`);

    const location = locations[0];
    if (!location) {
      console.error('❌ No location found');
      return;
    }

    // Create bookings for different times today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Create bookings at different hours
    const bookingTimes = [
      new Date(today.setHours(9, 0, 0, 0)),   // 9:00 AM
      new Date(today.setHours(10, 30, 0, 0)), // 10:30 AM
      new Date(today.setHours(12, 0, 0, 0)),  // 12:00 PM
      new Date(today.setHours(14, 0, 0, 0)),  // 2:00 PM
      new Date(today.setHours(15, 30, 0, 0)), // 3:30 PM
      new Date(today.setHours(17, 0, 0, 0)),  // 5:00 PM
    ];

    let createdCount = 0;

    for (let i = 0; i < bookingTimes.length; i++) {
      const bookingTime = bookingTimes[i];
      const service = services[i % services.length];
      const customer = customers[i % customers.length];
      
      // Alternate between assigned and unassigned bookings
      const isUnassigned = i % 3 === 0;
      const staffMember = isUnassigned ? null : staff[i % staff.length];

      const endTime = new Date(bookingTime);
      endTime.setMinutes(endTime.getMinutes() + service.duration);

      try {
        const booking = await prisma.booking.create({
          data: {
            merchant: { connect: { id: merchant.id } },
            customer: { connect: { id: customer.id } },
            provider: staffMember ? { connect: { id: staffMember.id } } : undefined,
            location: { connect: { id: location.id } },
            bookingNumber: `TEST-${Date.now()}-${i}`,
            totalAmount: service.price,
            createdBy: { connect: { id: staff[0].id } },
            startTime: bookingTime,
            endTime: endTime,
            status: i === 0 ? 'CANCELLED' : 'CONFIRMED', // Make first one cancelled for variety
            source: 'WALK_IN',
            notes: isUnassigned ? 'Next available staff' : null,
            services: {
              create: {
                service: { connect: { id: service.id } },
                staff: staffMember ? { connect: { id: staffMember.id } } : undefined,
                price: service.price,
                duration: service.duration
              }
            }
          },
          include: {
            customer: true,
            provider: true,
            services: { include: { service: true } }
          }
        });

        console.log(`✅ Created booking at ${bookingTime.toLocaleTimeString('en-AU')} - ${staffMember ? staffMember.firstName : 'Unassigned'} - ${customer.firstName} ${customer.lastName}`);
        createdCount++;
      } catch (error: any) {
        console.error(`❌ Failed to create booking at ${bookingTime.toLocaleTimeString('en-AU')}:`, error.message || error);
      }
    }

    // Create one overlapping booking to test overlap handling
    if (staff.length >= 2) {
      const overlapTime = new Date(today.setHours(14, 30, 0, 0)); // 2:30 PM (overlaps with 2:00 PM)
      const service = services[0];
      const customer = customers[0];
      const staffMember = staff[1]; // Different staff member

      const endTime = new Date(overlapTime);
      endTime.setMinutes(endTime.getMinutes() + service.duration);

      try {
        await prisma.booking.create({
          data: {
            merchant: { connect: { id: merchant.id } },
            customer: { connect: { id: customer.id } },
            provider: { connect: { id: staffMember.id } },
            location: { connect: { id: location.id } },
            bookingNumber: `TEST-OVERLAP-${Date.now()}`,
            totalAmount: service.price,
            createdBy: { connect: { id: staff[0].id } },
            startTime: overlapTime,
            endTime: endTime,
            status: 'CONFIRMED',
            source: 'ONLINE',
            notes: 'Overlapping booking test',
            services: {
              create: {
                service: { connect: { id: service.id } },
                staff: { connect: { id: staffMember.id } },
                price: service.price,
                duration: service.duration
              }
            }
          }
        });

        console.log(`✅ Created overlapping booking at ${overlapTime.toLocaleTimeString('en-AU')}`);
        createdCount++;
      } catch (error: any) {
        console.error('❌ Failed to create overlapping booking:', error.message || error);
      }
    }

    console.log(`\n✨ Successfully created ${createdCount} bookings for today`);

  } catch (error) {
    console.error('❌ Error seeding bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();