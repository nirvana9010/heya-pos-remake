const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/api/.env' });

const prisma = new PrismaClient();

async function fixOrderBookingSync() {
  try {
    // Find all paid orders with linked bookings that aren't marked as paid
    const paidOrdersWithUnpaidBookings = await prisma.order.findMany({
      where: {
        state: { in: ['PAID', 'COMPLETED'] },
        bookingId: { not: null },
        booking: {
          paymentStatus: { not: 'PAID' }
        }
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            paymentStatus: true,
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        payments: {
          where: { status: 'COMPLETED' },
          orderBy: { processedAt: 'desc' },
          take: 1
        }
      }
    });
    
    console.log(`Found ${paidOrdersWithUnpaidBookings.length} paid orders with unpaid bookings`);
    
    let updated = 0;
    for (const order of paidOrdersWithUnpaidBookings) {
      const customerName = order.booking.customer 
        ? `${order.booking.customer.firstName} ${order.booking.customer.lastName || ''}`.trim()
        : 'Unknown';
      
      console.log(`\nFixing: Order ${order.orderNumber} -> Booking ${order.booking.bookingNumber} (${customerName})`);
      console.log(`  Order: ${order.state}, Total: $${order.totalAmount}, Paid: $${order.paidAmount}`);
      console.log(`  Booking: ${order.booking.paymentStatus}`);
      
      const paymentMethod = order.payments[0]?.paymentMethod || 'CASH';
      
      // Update the booking to match the order's payment status
      await prisma.booking.update({
        where: { id: order.bookingId },
        data: {
          paymentStatus: 'PAID',
          paidAmount: order.paidAmount || order.totalAmount,
          paymentMethod: paymentMethod,
          paidAt: order.payments[0]?.processedAt || new Date(),
        }
      });
      
      updated++;
      console.log(`  ✓ Updated booking to PAID with method: ${paymentMethod}`);
    }
    
    console.log(`\n✅ Fixed ${updated} bookings`);
    
    // Now update customer stats for affected customers
    console.log('\nUpdating customer stats...');
    const affectedCustomerIds = [...new Set(
      paidOrdersWithUnpaidBookings
        .map(o => o.booking.customer?.id)
        .filter(Boolean)
    )];
    
    for (const customerId of affectedCustomerIds) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          bookings: {
            where: { 
              OR: [
                { status: 'COMPLETED' },
                { paymentStatus: 'PAID' }
              ]
            }
          }
        }
      });
      
      if (customer) {
        const visits = customer.bookings.length;
        const spent = customer.bookings.reduce((sum, b) => 
          sum + Number(b.paidAmount || b.totalAmount || 0), 0
        );
        
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            visitCount: visits,
            lifetimeVisits: visits,
            totalSpent: spent
          }
        });
        
        console.log(`Updated ${customer.firstName} ${customer.lastName || ''}: ${visits} visits, $${spent}`);
      }
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrderBookingSync();