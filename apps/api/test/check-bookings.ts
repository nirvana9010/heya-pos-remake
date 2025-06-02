import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookings() {
  try {
    // Get all bookings
    const bookings = await prisma.booking.findMany({
      orderBy: { startTime: 'desc' },
      take: 20,
      include: {
        customer: true,
        provider: true,
      }
    });
    
    console.log('Recent Bookings:');
    console.log('==================');
    console.log(`Total bookings found: ${bookings.length}`);
    
    bookings.forEach(b => {
      const date = new Date(b.startTime);
      console.log(`\n- Booking ${b.bookingNumber}:`);
      console.log(`  Date: ${date.toISOString().split('T')[0]}`);
      console.log(`  Time: ${date.toTimeString().split(' ')[0]}`);
      console.log(`  Status: ${b.status}`);
      console.log(`  Customer: ${b.customer.firstName} ${b.customer.lastName}`);
      console.log(`  Provider: ${b.provider.firstName} ${b.provider.lastName}`);
    });
    
    // Check specifically for June 1st bookings
    const june1st = new Date('2025-06-01');
    const june2nd = new Date('2025-06-02');
    
    const june1stBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: june1st,
          lt: june2nd,
        }
      }
    });
    
    console.log(`\n\nBookings for June 1st, 2025: ${june1stBookings.length}`);
    
  } catch (error) {
    console.error('Error checking bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();