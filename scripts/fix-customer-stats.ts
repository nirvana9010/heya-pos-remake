import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCustomerStats() {
  try {
    console.log('Starting customer stats recalculation...\n');
    
    // Get all customers
    const customers = await prisma.customer.findMany({
      select: { id: true, firstName: true, lastName: true }
    });

    console.log(`Found ${customers.length} customers to process\n`);

    for (const customer of customers) {
      // Count paid bookings (avoiding double counting with orders)
      const paidBookings = await prisma.booking.count({
        where: {
          customerId: customer.id,
          paymentStatus: 'PAID'
        }
      });

      // Count standalone paid orders (orders without bookings)
      const standaloneOrders = await prisma.order.count({
        where: {
          customerId: customer.id,
          state: 'PAID',
          bookingId: null
        }
      });

      // Calculate total spent from paid bookings
      const bookingSpentResult = await prisma.booking.aggregate({
        where: {
          customerId: customer.id,
          paymentStatus: 'PAID'
        },
        _sum: {
          paidAmount: true,
          totalAmount: true
        }
      });

      // Calculate total spent from standalone orders
      const orderSpentResult = await prisma.order.aggregate({
        where: {
          customerId: customer.id,
          state: 'PAID',
          bookingId: null
        },
        _sum: {
          totalAmount: true
        }
      });

      // Use paidAmount if available, otherwise totalAmount
      const bookingSpent = Number(bookingSpentResult._sum.paidAmount || bookingSpentResult._sum.totalAmount || 0);
      const orderSpent = Number(orderSpentResult._sum.totalAmount || 0);
      
      const totalVisits = paidBookings + standaloneOrders;
      const totalSpent = bookingSpent + orderSpent;

      // Update customer stats
      const updated = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          visitCount: totalVisits,
          lifetimeVisits: totalVisits,
          totalSpent: totalSpent
        }
      });

      console.log(`Updated ${customer.firstName} ${customer.lastName || ''}:`);
      console.log(`  Visits: ${totalVisits} (${paidBookings} bookings + ${standaloneOrders} orders)`);
      console.log(`  Total Spent: $${totalSpent.toFixed(2)}`);
      console.log('');
    }

    console.log('Customer stats recalculation completed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomerStats();