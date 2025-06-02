import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJuneBookings() {
  try {
    // Check specifically for June 1st bookings
    const june1st = new Date('2025-06-01T00:00:00.000Z');
    const june2nd = new Date('2025-06-02T00:00:00.000Z');
    
    console.log('Checking for June 1st bookings...');
    console.log('Date range:', {
      start: june1st.toISOString(),
      end: june2nd.toISOString()
    });
    
    const june1stBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: june1st,
          lt: june2nd,
        }
      },
      include: {
        customer: true,
        provider: true,
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
    
    console.log(`\nFound ${june1stBookings.length} bookings for June 1st, 2025:\n`);
    
    june1stBookings.forEach((booking, index) => {
      console.log(`${index + 1}. Booking ${booking.bookingNumber}:`);
      console.log(`   Raw startTime: ${booking.startTime}`);
      console.log(`   ISO string: ${booking.startTime.toISOString()}`);
      console.log(`   Local string: ${booking.startTime.toString()}`);
      console.log(`   Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`   Provider: ${booking.provider.firstName} ${booking.provider.lastName}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Services: ${booking.services.map(s => s.service.name).join(', ')}`);
      console.log('');
    });
    
    // Also test the API's date filtering logic
    console.log('\nTesting date filtering with date-fns...');
    const { startOfDay, endOfDay } = await import('date-fns');
    
    const dateParam = '2025-06-01';
    const dateObj = new Date(dateParam);
    const dayStart = startOfDay(dateObj);
    const dayEnd = endOfDay(dateObj);
    
    console.log('Date parameter:', dateParam);
    console.log('Date object:', dateObj.toISOString());
    console.log('Start of day:', dayStart.toISOString());
    console.log('End of day:', dayEnd.toISOString());
    
    const filteredBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        }
      }
    });
    
    console.log(`\nBookings found using date-fns filtering: ${filteredBookings.length}`);
    
  } catch (error) {
    console.error('Error checking bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJuneBookings();