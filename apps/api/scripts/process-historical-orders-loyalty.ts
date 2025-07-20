import { PrismaClient } from '@prisma/client';
import { LoyaltyService } from '../src/loyalty/loyalty.service';

async function processHistoricalOrdersForLoyalty() {
  const prisma = new PrismaClient();
  const loyaltyService = new LoyaltyService(prisma);

  try {
    console.log('Starting historical orders loyalty processing...');

    // Get all paid orders that have a customerId and are not linked to bookings
    const paidOrders = await prisma.order.findMany({
      where: {
        state: 'PAID',
        customerId: { not: null },
        bookingId: null // Only process direct orders, not booking-based orders
      },
      include: {
        customer: true,
        merchant: true
      },
      orderBy: {
        createdAt: 'asc' // Process oldest first
      }
    });

    console.log(`Found ${paidOrders.length} paid orders to process for loyalty`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of paidOrders) {
      try {
        // Check if this order already has loyalty transactions
        const existingTransaction = await prisma.loyaltyTransaction.findFirst({
          where: {
            orderId: order.id,
            type: 'EARNED'
          }
        });

        if (existingTransaction) {
          console.log(`Order ${order.orderNumber} already has loyalty transaction, skipping`);
          skipped++;
          continue;
        }

        // Check if merchant has active loyalty program
        const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
          where: {
            merchantId: order.merchantId,
            isActive: true
          }
        });

        if (!loyaltyProgram) {
          console.log(`Merchant ${order.merchant.name} doesn't have active loyalty program, skipping order ${order.orderNumber}`);
          skipped++;
          continue;
        }

        // Process the order for loyalty
        await loyaltyService.processOrderCompletion(order.id);
        
        console.log(`✓ Processed order ${order.orderNumber} for customer ${order.customer.firstName} ${order.customer.lastName || ''}`);
        processed++;

      } catch (error) {
        console.error(`✗ Error processing order ${order.orderNumber}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total orders found: ${paidOrders.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Skipped (already processed or no loyalty program): ${skipped}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
processHistoricalOrdersForLoyalty()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });