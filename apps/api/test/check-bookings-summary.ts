import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookingsSummary() {
  try {
    // Get booking counts by status
    const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    
    console.log('📊 Booking Summary:');
    console.log('==================');
    
    for (const status of statuses) {
      const count = await prisma.booking.count({
        where: { status }
      });
      console.log(`${status}: ${count}`);
    }
    
    const total = await prisma.booking.count();
    console.log(`\nTOTAL: ${total}`);
    
    // Get recent bookings
    console.log('\n📅 Recent Bookings:');
    console.log('==================');
    
    const recentBookings = await prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        provider: true,
        services: {
          include: {
            service: true
          }
        }
      }
    });
    
    for (const booking of recentBookings) {
      const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`;
      const providerName = `${booking.provider.firstName} ${booking.provider.lastName}`;
      const serviceNames = booking.services.map(s => s.service.name).join(', ');
      const startTime = new Date(booking.startTime).toLocaleString('en-AU', { 
        timeZone: 'Australia/Sydney',
        dateStyle: 'short',
        timeStyle: 'short'
      });
      
      console.log(`\n${booking.bookingNumber}:`);
      console.log(`  Customer: ${customerName}`);
      console.log(`  Provider: ${providerName}`);
      console.log(`  Service: ${serviceNames}`);
      console.log(`  Time: ${startTime}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Total: $${booking.totalAmount}`);
    }
    
    // Get bookings by date
    console.log('\n📆 Bookings by Date:');
    console.log('===================');
    
    const bookingsByDate = await prisma.booking.groupBy({
      by: ['startTime'],
      _count: true,
      orderBy: {
        startTime: 'asc'
      }
    });
    
    const dateGroups = new Map<string, number>();
    
    for (const group of bookingsByDate) {
      const date = new Date(group.startTime).toLocaleDateString('en-AU', {
        timeZone: 'Australia/Sydney'
      });
      dateGroups.set(date, (dateGroups.get(date) || 0) + group._count);
    }
    
    for (const [date, count] of dateGroups) {
      console.log(`${date}: ${count} bookings`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingsSummary();