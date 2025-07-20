const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/api/.env' });

const prisma = new PrismaClient();

async function fixCustomerStats() {
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
          }
        }
      });
      
      let updated = 0;
      for (const customer of customers) {
        const actualVisits = customer.bookings.length;
        const actualSpent = customer.bookings.reduce((sum, b) => {
          const amount = b.paidAmount || b.totalAmount || 0;
          return sum + Number(amount);
        }, 0);
        
        // Update if there's a mismatch
        if (customer.visitCount !== actualVisits || Number(customer.totalSpent) !== actualSpent) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              visitCount: actualVisits,
              lifetimeVisits: actualVisits,
              totalSpent: actualSpent
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
fixCustomerStats();