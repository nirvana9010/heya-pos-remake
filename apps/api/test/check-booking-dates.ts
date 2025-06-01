import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookingDates() {
  try {
    console.log('=== BOOKING DATES ANALYSIS ===\n');
    console.log(`Current Date/Time: ${new Date().toISOString()}`);
    console.log(`Today's Date: ${new Date().toLocaleDateString()}\n`);

    // Get total booking count
    const totalBookings = await prisma.booking.count();
    console.log(`Total Bookings in Database: ${totalBookings}\n`);

    // Get earliest and latest booking dates
    const bookingDateRange = await prisma.booking.aggregate({
      _min: {
        startTime: true,
      },
      _max: {
        startTime: true,
      },
    });

    console.log('=== DATE RANGE ===');
    console.log(`Earliest Booking: ${bookingDateRange._min.startTime}`);
    console.log(`Latest Booking: ${bookingDateRange._max.startTime}\n`);

    // Get all bookings and group by date manually
    const allBookings = await prisma.booking.findMany({
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Group bookings by date
    const bookingsByDate = new Map<string, number>();
    allBookings.forEach((booking) => {
      const dateStr = booking.startTime.toISOString().split('T')[0];
      bookingsByDate.set(dateStr, (bookingsByDate.get(dateStr) || 0) + 1);
    });

    console.log('=== BOOKINGS BY DATE (Most Recent First) ===');
    const sortedDates = Array.from(bookingsByDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    sortedDates.forEach(([dateStr, count]) => {
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const isFuture = new Date(dateStr) > new Date();
      const marker = isToday ? ' <- TODAY' : isFuture ? ' <- FUTURE' : '';
      console.log(`${dateStr}: ${count} bookings${marker}`);
    });

    // Check specifically for bookings on or after June 1, 2025
    const june1 = new Date('2025-06-01T00:00:00Z');
    const currentAndFutureBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: june1,
        },
      },
      select: {
        id: true,
        bookingNumber: true,
        startTime: true,
        endTime: true,
        status: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        services: {
          select: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    console.log('\n=== BOOKINGS ON OR AFTER JUNE 1, 2025 ===');
    console.log(`Found ${currentAndFutureBookings.length} bookings:\n`);
    
    if (currentAndFutureBookings.length > 0) {
      currentAndFutureBookings.forEach((booking) => {
        const services = booking.services.map(s => s.service.name).join(', ');
        console.log(`ID: ${booking.id}`);
        console.log(`Booking Number: ${booking.bookingNumber}`);
        console.log(`Date: ${booking.startTime.toISOString().split('T')[0]}`);
        console.log(`Time: ${booking.startTime.toTimeString().split(' ')[0]} - ${booking.endTime.toTimeString().split(' ')[0]}`);
        console.log(`Status: ${booking.status}`);
        console.log(`Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
        console.log(`Services: ${services}`);
        console.log('---');
      });
    } else {
      console.log('No bookings found on or after June 1, 2025');
    }

    // Check the most recent 10 bookings regardless of date
    const recentBookings = await prisma.booking.findMany({
      take: 10,
      orderBy: {
        startTime: 'desc',
      },
      select: {
        id: true,
        bookingNumber: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    console.log('\n=== 10 MOST RECENT BOOKINGS ===');
    recentBookings.forEach((booking) => {
      const dateStr = booking.startTime.toISOString().split('T')[0];
      const timeStr = booking.startTime.toTimeString().split(' ')[0];
      console.log(`${dateStr} ${timeStr} - Booking #${booking.bookingNumber} - Status: ${booking.status}`);
    });

    // Check for any data type issues or timezone problems
    const sampleBooking = await prisma.booking.findFirst();
    if (sampleBooking) {
      console.log('\n=== SAMPLE BOOKING DATA INSPECTION ===');
      console.log('Raw startTime from DB:', sampleBooking.startTime);
      console.log('StartTime type:', typeof sampleBooking.startTime);
      console.log('StartTime ISO String:', sampleBooking.startTime.toISOString());
      console.log('StartTime Local String:', sampleBooking.startTime.toLocaleDateString());
      console.log('Timezone offset (minutes):', sampleBooking.startTime.getTimezoneOffset());
    }

    // Check specifically for today's bookings
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysBookings = await prisma.booking.count({
      where: {
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    console.log(`\n=== TODAY'S BOOKINGS ===`);
    console.log(`Bookings for today (${todayStart.toISOString().split('T')[0]}): ${todaysBookings}`);

  } catch (error) {
    console.error('Error checking booking dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingDates();