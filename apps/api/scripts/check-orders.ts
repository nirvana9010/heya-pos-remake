import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  console.log('Checking orders for Hamilton Beauty Spa...\n');

  // Find merchant
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: 'hamilton' }
  });

  if (!merchant) {
    console.log('❌ Hamilton Beauty Spa merchant NOT FOUND!');
    return;
  }

  console.log('✅ Found merchant:', merchant.name);

  // Get today's date parts
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const expectedPrefix = `OR-${year}${month}${day}`;

  console.log(`\n📅 Today's order prefix should be: ${expectedPrefix}`);

  // Check all orders for this merchant
  const orders = await prisma.order.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      state: true
    }
  });

  console.log(`\n📋 Recent orders (${orders.length}):`);
  orders.forEach(order => {
    console.log(`   ${order.orderNumber} - ${order.state} - ${order.createdAt.toISOString()}`);
  });

  // Check for duplicate order numbers
  const duplicates = await prisma.$queryRaw`
    SELECT "orderNumber", COUNT(*) as count
    FROM "Order"
    WHERE "merchantId" = ${merchant.id}
    GROUP BY "orderNumber"
    HAVING COUNT(*) > 1
  `;

  if (Array.isArray(duplicates) && duplicates.length > 0) {
    console.log('\n⚠️  DUPLICATE ORDER NUMBERS FOUND:');
    duplicates.forEach((dup: any) => {
      console.log(`   ${dup.orderNumber} appears ${dup.count} times`);
    });
  } else {
    console.log('\n✅ No duplicate order numbers found');
  }

  // Check today's orders
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  const todayOrders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      createdAt: {
        gte: startOfDay
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📊 Orders created today: ${todayOrders.length}`);
  if (todayOrders.length > 0) {
    console.log('Latest order number:', todayOrders[0].orderNumber);
  }
}

checkOrders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());