import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuickSaleCustomerUpdate() {
  try {
    // Check most recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        payments: true
      }
    });

    console.log('\n=== Recent Orders ===');
    recentOrders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log('  ID:', order.id);
      console.log('  Order Number:', order.orderNumber);
      console.log('  State:', order.state);
      console.log('  Customer ID:', order.customerId);
      console.log('  Customer Name:', order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'None');
      console.log('  Total Amount:', order.totalAmount);
      console.log('  Created:', order.createdAt);
      console.log('  Has Booking:', !!order.bookingId);
      console.log('  Payments:', order.payments.length);
    });

    // Check if there are any recent orders with null customerId that are PAID
    const paidOrdersWithoutCustomer = await prisma.order.count({
      where: {
        state: 'PAID',
        customerId: null,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    console.log(`\n=== Analysis ===`);
    console.log(`Paid orders without customer (last 24h): ${paidOrdersWithoutCustomer}`);

    // Check payment processing logs
    const recentPayments = await prisma.orderPayment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    });

    console.log('\n=== Recent Payments ===');
    recentPayments.forEach((payment, index) => {
      console.log(`\nPayment ${index + 1}:`);
      console.log('  Order ID:', payment.orderId);
      console.log('  Amount:', payment.amount);
      console.log('  Status:', payment.status);
      console.log('  Method:', payment.paymentMethod);
      console.log('  Order State:', payment.order.state);
      console.log('  Order Customer:', payment.order.customerId ? 'Yes' : 'No');
      if (payment.order.customer) {
        console.log('  Customer Name:', `${payment.order.customer.firstName} ${payment.order.customer.lastName}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuickSaleCustomerUpdate();