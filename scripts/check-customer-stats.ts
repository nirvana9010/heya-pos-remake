import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomerStats() {
  try {
    // Find Lukas Nguyen
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { firstName: 'Lukas', lastName: 'Nguyen' },
          { firstName: 'Lukas' }
        ]
      }
    });

    if (!customer) {
      console.log('Customer not found');
      return;
    }

    console.log('\n=== Customer Details ===');
    console.log('ID:', customer.id);
    console.log('Name:', customer.firstName, customer.lastName);
    console.log('Current visitCount:', customer.visitCount);
    console.log('Current totalSpent:', customer.totalSpent);

    // Get all bookings
    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: {
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== Bookings Analysis ===');
    console.log('Total bookings:', bookings.length);
    
    let totalFromBookings = 0;
    let paidBookings = 0;
    let completedBookings = 0;

    bookings.forEach((booking, index) => {
      const bookingTotal = Number(booking.totalAmount || 0);
      const paidAmount = Number(booking.paidAmount || 0);
      
      console.log(`\nBooking ${index + 1}:`, booking.bookingNumber);
      console.log('  Status:', booking.status);
      console.log('  Payment Status:', booking.paymentStatus);
      console.log('  Total Amount:', bookingTotal);
      console.log('  Paid Amount:', paidAmount);
      console.log('  Created:', booking.createdAt);
      
      if (booking.paymentStatus === 'PAID') {
        paidBookings++;
        totalFromBookings += paidAmount || bookingTotal;
      }
      
      if (booking.status === 'COMPLETED') {
        completedBookings++;
      }
    });

    console.log('\n=== Bookings Summary ===');
    console.log('Total bookings:', bookings.length);
    console.log('Paid bookings:', paidBookings);
    console.log('Completed bookings:', completedBookings);
    console.log('Total amount from paid bookings:', totalFromBookings);

    // Get all orders
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: true,
        payments: true
      }
    });

    console.log('\n=== Orders Analysis ===');
    console.log('Total orders:', orders.length);
    
    let totalFromOrders = 0;
    let paidOrders = 0;

    orders.forEach((order, index) => {
      const orderTotal = Number(order.totalAmount || 0);
      console.log(`\nOrder ${index + 1}:`, order.orderNumber);
      console.log('  State:', order.state);
      console.log('  Total Amount:', orderTotal);
      console.log('  Has Booking:', !!order.bookingId);
      
      if (order.state === 'PAID') {
        paidOrders++;
        totalFromOrders += orderTotal;
      }
    });

    console.log('\n=== Orders Summary ===');
    console.log('Total orders:', orders.length);
    console.log('Paid orders:', paidOrders);
    console.log('Total amount from paid orders:', totalFromOrders);

    console.log('\n=== Expected vs Actual ===');
    console.log('Expected visitCount:', paidBookings + paidOrders);
    console.log('Actual visitCount:', customer.visitCount);
    console.log('Expected totalSpent:', totalFromBookings + totalFromOrders);
    console.log('Actual totalSpent:', customer.totalSpent);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerStats();