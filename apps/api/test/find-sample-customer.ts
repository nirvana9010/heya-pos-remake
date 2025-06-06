import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCustomer() {
  try {
    // Search for customers with SAMPLE in their name
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: 'SAMPLE' } },
          { lastName: { contains: 'NAME' } },
          { firstName: { contains: 'sample' } },
          { lastName: { contains: 'name' } }
        ]
      },
      include: {
        bookings: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    console.log(`Found ${customers.length} customers with 'SAMPLE' or 'NAME' in their name:`);
    customers.forEach(customer => {
      console.log(`\nCustomer: ${customer.firstName} ${customer.lastName} (ID: ${customer.id})`);
      console.log(`  Email: ${customer.email}`);
      console.log(`  Phone: ${customer.phone || customer.mobile}`);
      console.log(`  Recent bookings: ${customer.bookings.length}`);
      customer.bookings.forEach(booking => {
        console.log(`    - ${booking.bookingNumber} on ${booking.startTime} (${booking.status})`);
      });
    });

    // Also check for any bookings that might have HCCHJO in their fields
    const bookingsWithHCCHJO = await prisma.booking.findMany({
      where: {
        OR: [
          { bookingNumber: { contains: 'HCCHJO' } },
          { notes: { contains: 'HCCHJO' } },
          { id: 'HCCHJO' }
        ]
      },
      include: {
        customer: true
      }
    });

    console.log(`\n\nBookings containing 'HCCHJO': ${bookingsWithHCCHJO.length}`);
    bookingsWithHCCHJO.forEach(booking => {
      console.log(`- ${booking.bookingNumber}: ${booking.customer.firstName} ${booking.customer.lastName}`);
    });

  } catch (error) {
    console.error('Error searching for customer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCustomer();