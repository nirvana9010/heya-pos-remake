import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTimezoneHandling() {
  try {
    console.log('=== TIMEZONE ANALYSIS ===\n');
    
    // Current system info
    console.log('System Information:');
    console.log(`Current UTC Time: ${new Date().toISOString()}`);
    console.log(`Current Local Time: ${new Date().toString()}`);
    console.log(`Timezone Offset (minutes from UTC): ${new Date().getTimezoneOffset()}`);
    console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);

    // Check a specific date - June 1, 2025
    const june1Local = new Date('2025-06-01');
    const june1UTC = new Date('2025-06-01T00:00:00Z');
    
    console.log('June 1, 2025 Analysis:');
    console.log(`Local midnight: ${june1Local.toISOString()} (${june1Local.toString()})`);
    console.log(`UTC midnight: ${june1UTC.toISOString()} (${june1UTC.toString()})\n`);

    // Get bookings for "today" using different date calculations
    const now = new Date();
    
    // Method 1: Local date boundaries
    const todayStartLocal = new Date();
    todayStartLocal.setHours(0, 0, 0, 0);
    const todayEndLocal = new Date();
    todayEndLocal.setHours(23, 59, 59, 999);
    
    // Method 2: UTC date boundaries
    const todayStartUTC = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
    const todayEndUTC = new Date(now.toISOString().split('T')[0] + 'T23:59:59Z');
    
    console.log('Today\'s Date Boundaries:');
    console.log('Local Method:');
    console.log(`  Start: ${todayStartLocal.toISOString()} (${todayStartLocal.toString()})`);
    console.log(`  End: ${todayEndLocal.toISOString()} (${todayEndLocal.toString()})`);
    console.log('UTC Method:');
    console.log(`  Start: ${todayStartUTC.toISOString()} (${todayStartUTC.toString()})`);
    console.log(`  End: ${todayEndUTC.toISOString()} (${todayEndUTC.toString()})\n`);

    // Count bookings using both methods
    const bookingsLocalMethod = await prisma.booking.count({
      where: {
        startTime: {
          gte: todayStartLocal,
          lte: todayEndLocal,
        },
      },
    });

    const bookingsUTCMethod = await prisma.booking.count({
      where: {
        startTime: {
          gte: todayStartUTC,
          lte: todayEndUTC,
        },
      },
    });

    console.log('Booking Counts for "Today":');
    console.log(`Using Local boundaries: ${bookingsLocalMethod} bookings`);
    console.log(`Using UTC boundaries: ${bookingsUTCMethod} bookings\n`);

    // Get some sample bookings to see the actual times
    const sampleBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: new Date('2025-06-01T00:00:00Z'),
          lt: new Date('2025-06-02T00:00:00Z'),
        },
      },
      select: {
        id: true,
        bookingNumber: true,
        startTime: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 5,
    });

    console.log('Sample Bookings for June 1, 2025 (UTC range):');
    sampleBookings.forEach((booking) => {
      console.log(`\nBooking ${booking.bookingNumber}:`);
      console.log(`  Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`  DB Value: ${booking.startTime}`);
      console.log(`  ISO String: ${booking.startTime.toISOString()}`);
      console.log(`  Local String: ${booking.startTime.toString()}`);
      console.log(`  Date only (ISO): ${booking.startTime.toISOString().split('T')[0]}`);
      console.log(`  Date only (Local): ${booking.startTime.toLocaleDateString()}`);
    });

    // Check how the bookings service might be querying
    const merchantTimezone = 'Australia/Sydney'; // Assuming this from the data
    console.log(`\n\nMerchant Timezone Analysis (${merchantTimezone}):`);
    
    // Convert current time to merchant timezone
    const merchantTime = new Date().toLocaleString('en-US', { timeZone: merchantTimezone });
    console.log(`Current time in ${merchantTimezone}: ${merchantTime}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimezoneHandling();