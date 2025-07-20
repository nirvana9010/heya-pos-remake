const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/api/.env' });

const prisma = new PrismaClient();

async function fixCustomerStatsWithOrders() {
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany();
    
    for (const merchant of merchants) {
      console.log(`\nProcessing merchant: ${merchant.name}`);
      
      // Get all customers for this merchant
      const customers = await prisma.customer.findMany({
        where: { merchantId: merchant.id },
        include: {
          bookings: {
            where: { status: 'COMPLETED' },
            select: {
              totalAmount: true,
              paidAmount: true,
            }
          },
          orders: {
            where: { 
              state: { in: ['PAID', 'COMPLETED'] }
            },
            select: {
              totalAmount: true,
              paidAmount: true,
              bookingId: true  // To avoid double counting
            }
          }
        }
      });
      
      let updated = 0;
      for (const customer of customers) {
        // Calculate from completed bookings
        const bookingVisits = customer.bookings.length;
        const bookingSpent = customer.bookings.reduce((sum, b) => {
          const amount = b.paidAmount || b.totalAmount || 0;
          return sum + Number(amount);
        }, 0);
        
        // Calculate from paid orders (excluding those linked to bookings to avoid double counting)
        const standaloneOrders = customer.orders.filter(o => !o.bookingId);
        const orderVisits = standaloneOrders.length;
        const orderSpent = standaloneOrders.reduce((sum, o) => {
          const amount = o.paidAmount || o.totalAmount || 0;
          return sum + Number(amount);
        }, 0);
        
        // Total stats
        const totalVisits = bookingVisits + orderVisits;
        const totalSpent = bookingSpent + orderSpent;
        
        // Update if there's a mismatch
        if (customer.visitCount !== totalVisits || Number(customer.totalSpent) !== totalSpent) {
          console.log(`  Updating ${customer.firstName} ${customer.lastName || ''}: ${customer.visitCount} -> ${totalVisits} visits, $${customer.totalSpent} -> $${totalSpent}`);
          
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              visitCount: totalVisits,
              lifetimeVisits: totalVisits,
              totalSpent: totalSpent
            }
          });
          updated++;
        }
      }
      
      console.log(`  Updated ${updated} customers out of ${customers.length}`);
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCustomerStatsWithOrders();