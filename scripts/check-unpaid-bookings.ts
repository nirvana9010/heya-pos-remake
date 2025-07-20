import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUnpaidBookings() {
  try {
    // Find all Lukas Nguyen customers
    const lukasCustomers = await prisma.customer.findMany({
      where: {
        firstName: 'Lukas',
        lastName: 'Nguyen'
      }
    });

    console.log(`Found ${lukasCustomers.length} customers named Lukas Nguyen:\n`);
    
    for (const customer of lukasCustomers) {
      console.log(`Customer ID: ${customer.id}`);
      console.log(`Email: ${customer.email}`);
      console.log(`Phone: ${customer.phone}`);
      console.log(`Created: ${customer.createdAt}`);
      
      const bookingCount = await prisma.booking.count({
        where: { customerId: customer.id }
      });
      
      const paidBookingCount = await prisma.booking.count({
        where: { 
          customerId: customer.id,
          paymentStatus: 'PAID'
        }
      });
      
      console.log(`Bookings: ${bookingCount} total, ${paidBookingCount} paid`);
      console.log('---\n');
    }

    // Check for duplicate customers with similar names
    const allLukas = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: 'Lukas' } },
          { lastName: { contains: 'Nguyen' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        visitCount: true,
        totalSpent: true
      }
    });

    console.log('\nAll customers with Lukas or Nguyen in their name:');
    allLukas.forEach(c => {
      console.log(`${c.firstName} ${c.lastName || ''} - ${c.email || 'no email'} - Visits: ${c.visitCount}, Spent: $${c.totalSpent}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnpaidBookings();