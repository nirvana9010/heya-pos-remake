import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findBooking() {
  try {
    // Search by bookingNumber
    const bookingByNumber = await prisma.booking.findFirst({
      where: {
        bookingNumber: 'HCCHJO'
      },
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

    if (bookingByNumber) {
      console.log('Found booking by bookingNumber:', JSON.stringify(bookingByNumber, null, 2));
    } else {
      console.log('No booking found with bookingNumber HCCHJO');
    }

    // Search by customer name and date
    const customerBookings = await prisma.booking.findMany({
      where: {
        customer: {
          OR: [
            { firstName: { contains: 'SAMPLE' } },
            { lastName: { contains: 'NAME' } },
            { firstName: 'SAMPLE', lastName: 'NAME' }
          ]
        },
        startTime: {
          gte: new Date('2025-06-13T00:00:00.000Z'),
          lt: new Date('2025-06-14T00:00:00.000Z')
        }
      },
      include: {
        customer: true,
        services: {
          include: {
            service: true,
            staff: true
          }
        }
      }
    });

    console.log(`\nFound ${customerBookings.length} bookings for SAMPLE NAME on June 13, 2025:`);
    customerBookings.forEach(booking => {
      console.log(`- ID: ${booking.id}, BookingNumber: ${booking.bookingNumber}, Status: ${booking.status}`);
      console.log(`  Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`  Time: ${booking.startTime} - ${booking.endTime}`);
    });

    // Also check if there's any booking with ID 'HCCHJO' (in case it was stored as ID)
    const bookingById = await prisma.booking.findUnique({
      where: { id: 'HCCHJO' }
    });

    if (bookingById) {
      console.log('\nFound booking by ID:', JSON.stringify(bookingById, null, 2));
    }

    // Search more broadly for any bookings on June 13
    const allJune13Bookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: new Date('2025-06-13T00:00:00.000Z'),
          lt: new Date('2025-06-14T00:00:00.000Z')
        }
      },
      include: {
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`\nTotal bookings on June 13, 2025: ${allJune13Bookings.length}`);
    console.log('Recent bookings on that date:');
    allJune13Bookings.forEach(booking => {
      console.log(`- ${booking.bookingNumber}: ${booking.customer.firstName} ${booking.customer.lastName} at ${booking.startTime}`);
    });

    // Also search broadly by bookingNumber pattern in case HCCHJO is partial
    const bookingsByPattern = await prisma.booking.findMany({
      where: {
        bookingNumber: {
          contains: 'HCCHJO'
        }
      },
      include: {
        customer: true
      }
    });

    if (bookingsByPattern.length > 0) {
      console.log(`\nFound ${bookingsByPattern.length} bookings containing 'HCCHJO' in bookingNumber:`);
      bookingsByPattern.forEach(booking => {
        console.log(`- ${booking.bookingNumber}: ${booking.customer.firstName} ${booking.customer.lastName}`);
      });
    }

  } catch (error) {
    console.error('Error searching for booking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findBooking();