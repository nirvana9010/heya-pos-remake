import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

async function processHistoricalOrdersForLoyalty() {
  const prisma = new PrismaClient();

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
      }
    });

    console.log(`Found ${paidOrders.length} paid direct orders to process`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of paidOrders) {
      try {
        // Check if this order already has a loyalty transaction
        const existingTransaction = await prisma.loyaltyTransaction.findFirst({
          where: {
            orderId: order.id
          }
        });

        if (existingTransaction) {
          skipped++;
          continue;
        }

        // Check if merchant has an active loyalty program
        const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
          where: {
            merchantId: order.merchantId,
            isActive: true
          }
        });

        if (!loyaltyProgram) {
          console.log(`No active loyalty program for merchant ${order.merchant.name}`);
          skipped++;
          continue;
        }

        // Process based on loyalty type
        if (loyaltyProgram.type === 'VISITS') {
          // For visits-based programs, increment visit count
          await prisma.$transaction(async (tx) => {
            // Create loyalty transaction
            await tx.loyaltyTransaction.create({
              data: {
                customerId: order.customerId!,
                merchantId: order.merchantId,
                orderId: order.id,
                type: 'EARNED',
                visitsDelta: 1,
                description: `Visit earned from order ${order.orderNumber}`,
                createdByStaffId: order.createdById
              }
            });

            // Update customer loyalty visits
            await tx.customer.update({
              where: { id: order.customerId! },
              data: {
                loyaltyVisits: { increment: 1 }
              }
            });
          });

          console.log(`✓ Processed VISIT for ${order.customer.firstName} ${order.customer.lastName || ''} - Order ${order.orderNumber}`);
        } else if (loyaltyProgram.type === 'POINTS') {
          // For points-based programs, calculate and award points
          const pointsEarned = Math.floor(
            Number(order.totalAmount) * Number(loyaltyProgram.pointsPerDollar || 1)
          );

          await prisma.$transaction(async (tx) => {
            // Update customer points first to get current balance
            const updatedCustomer = await tx.customer.update({
              where: { id: order.customerId! },
              data: {
                loyaltyPoints: { increment: pointsEarned }
              }
            });

            // Create loyalty transaction
            await tx.loyaltyTransaction.create({
              data: {
                customerId: order.customerId!,
                merchantId: order.merchantId,
                orderId: order.id,
                type: 'EARNED',
                points: pointsEarned,
                balance: Number(updatedCustomer.loyaltyPoints),
                description: `${pointsEarned} points earned from order ${order.orderNumber}`,
                createdByStaffId: order.createdById
              }
            });
          });

          console.log(`✓ Processed ${pointsEarned} POINTS for ${order.customer.firstName} ${order.customer.lastName || ''} - Order ${order.orderNumber}`);
        }

        processed++;
      } catch (error: any) {
        console.error(`Error processing order ${order.orderNumber}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Processing complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

    // Show updated loyalty stats
    console.log(`\nUpdated customer loyalty stats:`);
    const customersWithLoyalty = await prisma.customer.findMany({
      where: {
        OR: [
          { loyaltyVisits: { gt: 0 } },
          { loyaltyPoints: { gt: 0 } }
        ]
      },
      orderBy: { loyaltyVisits: 'desc' },
      take: 10
    });

    for (const customer of customersWithLoyalty) {
      console.log(`- ${customer.firstName} ${customer.lastName || ''}: ${customer.loyaltyVisits} visits, ${customer.loyaltyPoints} points`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the processing
processHistoricalOrdersForLoyalty();