import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function comprehensiveSearch() {
  try {
    console.log('=== COMPREHENSIVE BOOKING SEARCH ===\n');

    // 1. Search for the exact booking ID that contains HCCHJO
    const bookingWithHCCHJO = await prisma.booking.findUnique({
      where: { id: 'cmbk1shax0003vo2fjhhcchjo' },
      include: {
        customer: true,
        location: true,
        services: {
          include: {
            service: true,
            staff: true
          }
        }
      }
    });

    if (bookingWithHCCHJO) {
      console.log('1. Found booking with ID containing HCCHJO:');
      console.log(`   ID: ${bookingWithHCCHJO.id}`);
      console.log(`   Booking Number: ${bookingWithHCCHJO.bookingNumber}`);
      console.log(`   Customer: ${bookingWithHCCHJO.customer.firstName} ${bookingWithHCCHJO.customer.lastName}`);
      console.log(`   Date/Time: ${bookingWithHCCHJO.startTime}`);
      console.log(`   Status: ${bookingWithHCCHJO.status}`);
      console.log(`   Notes: ${bookingWithHCCHJO.notes}`);
    }

    // 2. Check all bookings for SAMPLE NAME customer
    const customerBookings = await prisma.booking.findMany({
      where: {
        customerId: 'cmbk1sh8p0001vo2fwr0wwuu3'
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`\n2. All bookings for SAMPLE NAME customer:`);
    customerBookings.forEach(booking => {
      const date = new Date(booking.startTime);
      console.log(`   - ${booking.bookingNumber} on ${date.toDateString()} at ${date.toTimeString()}`);
      console.log(`     ID: ${booking.id}`);
    });

    // 3. Check if there were any bookings on June 13, 2025
    const june13Start = new Date('2025-06-13T00:00:00.000Z');
    const june13End = new Date('2025-06-14T00:00:00.000Z');
    
    const june13Bookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: june13Start,
          lt: june13End
        }
      },
      include: {
        customer: true
      }
    });

    console.log(`\n3. All bookings on June 13, 2025:`);
    june13Bookings.forEach(booking => {
      console.log(`   - ${booking.bookingNumber}: ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`     ID: ${booking.id}`);
    });

    // 4. Search for any reference to HCCHJO in all text fields
    const allBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { id: { contains: 'HCCHJO' } },
          { bookingNumber: { contains: 'HCCHJO' } },
          { notes: { contains: 'HCCHJO' } }
        ]
      }
    });

    console.log(`\n4. Bookings containing 'HCCHJO' anywhere: ${allBookings.length}`);

    // 5. Check the database for the latest bookings
    const latestBookings = await prisma.booking.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        customer: true
      }
    });

    console.log(`\n5. Latest 5 bookings created:`);
    latestBookings.forEach(booking => {
      console.log(`   - ${booking.bookingNumber} for ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`     Created: ${booking.createdAt}`);
      console.log(`     ID: ${booking.id}`);
    });

  } catch (error) {
    console.error('Error in comprehensive search:', error);
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveSearch();