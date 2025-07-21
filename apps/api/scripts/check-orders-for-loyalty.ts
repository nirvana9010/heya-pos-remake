import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrdersForLoyalty() {
  try {
    console.log('Checking orders that should earn loyalty...\n');
    
    // Get all paid orders with customers
    const paidOrders = await prisma.order.findMany({
      where: {
        state: 'PAID',
        customerId: { not: null }
      },
      include: {
        customer: true,
        merchant: true,
        booking: true
      }
    });

    // Separate direct orders from booking-based orders
    const directOrders = paidOrders.filter(order => !order.bookingId);
    const bookingOrders = paidOrders.filter(order => order.bookingId);

    console.log(`Total paid orders with customers: ${paidOrders.length}`);
    console.log(`- Direct orders (Quick Sale): ${directOrders.length}`);
    console.log(`- Booking-based orders: ${bookingOrders.length}`);

    // Check which direct orders already have loyalty
    const directOrdersWithLoyalty = [];
    const directOrdersWithoutLoyalty = [];

    for (const order of directOrders) {
      const loyaltyTransaction = await prisma.loyaltyTransaction.findFirst({
        where: {
          orderId: order.id,
          type: 'EARNED'
        }
      });

      if (loyaltyTransaction) {
        directOrdersWithLoyalty.push(order);
      } else {
        directOrdersWithoutLoyalty.push(order);
      }
    }

    console.log(`\nDirect orders loyalty status:`);
    console.log(`- Already have loyalty: ${directOrdersWithLoyalty.length}`);
    console.log(`- Missing loyalty: ${directOrdersWithoutLoyalty.length}`);

    // Group by merchant for missing loyalty
    const merchantSummary = {};
    for (const order of directOrdersWithoutLoyalty) {
      const merchantName = order.merchant.name;
      if (!merchantSummary[merchantName]) {
        merchantSummary[merchantName] = {
          count: 0,
          totalAmount: 0,
          hasLoyaltyProgram: false
        };
      }
      merchantSummary[merchantName].count++;
      merchantSummary[merchantName].totalAmount += Number(order.totalAmount);
    }

    // Check which merchants have loyalty programs
    for (const merchantName of Object.keys(merchantSummary)) {
      const merchant = directOrdersWithoutLoyalty.find(o => o.merchant.name === merchantName)?.merchant;
      if (merchant) {
        const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
          where: {
            merchantId: merchant.id,
            isActive: true
          }
        });
        merchantSummary[merchantName].hasLoyaltyProgram = !!loyaltyProgram;
        merchantSummary[merchantName].loyaltyType = loyaltyProgram?.type;
      }
    }

    console.log(`\nOrders missing loyalty by merchant:`);
    for (const [merchantName, data] of Object.entries(merchantSummary)) {
      const merchantData = data as any;
      console.log(`\n${merchantName}:`);
      console.log(`  - Orders: ${merchantData.count}`);
      console.log(`  - Total revenue: $${merchantData.totalAmount.toFixed(2)}`);
      console.log(`  - Has active loyalty: ${merchantData.hasLoyaltyProgram ? `Yes (${merchantData.loyaltyType})` : 'No'}`);
    }

    // Show sample orders that would be processed
    console.log(`\nSample orders that need loyalty processing:`);
    const samples = directOrdersWithoutLoyalty.slice(0, 5);
    for (const order of samples) {
      console.log(`- Order ${order.orderNumber}: ${order.customer.firstName} ${order.customer.lastName || ''} - $${order.totalAmount} - ${order.merchant.name}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkOrdersForLoyalty()
  .then(() => {
    console.log('\nAnalysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });