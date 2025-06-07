import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookings() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        provider: true,
        location: true,
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });
    
    console.log('Booking Details:');
    console.log('================\n');
    
    bookings.forEach(booking => {
      console.log(`Booking ${booking.bookingNumber}:`);
      console.log(`  Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`  Provider: ${booking.provider.firstName} ${booking.provider.lastName}`);
      console.log(`  Location: ${booking.location.name}`);
      console.log(`  Date/Time: ${new Date(booking.startTime).toLocaleString()}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Total: $${booking.totalAmount}`);
      console.log(`  Services:`);
      booking.services.forEach(bs => {
        console.log(`    - ${bs.service.name} ($${bs.price}, ${bs.duration} min)`);
      });
      console.log('');
    });
    
    console.log(`\nTotal bookings: ${bookings.length}`);
    
    // Status breakdown
    const statusCounts = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nStatus breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error checking bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();