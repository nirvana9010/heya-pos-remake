const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentBookings() {
  try {
    // Get recent bookings from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: today
        },
        source: 'ONLINE'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        merchant: true,
        customer: true
      }
    });
    
    console.log(`\nFound ${bookings.length} ONLINE bookings from today:\n`);
    
    for (const booking of bookings) {
      console.log(`Booking ${booking.bookingNumber}:`);
      console.log(`  ID: ${booking.id}`);
      console.log(`  Created: ${booking.createdAt}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Customer: ${booking.customer.firstName} ${booking.customer.lastName || ''}`);
      console.log(`  Merchant: ${booking.merchant.name}`);
      
      // Check if notification exists for this booking
      const notification = await prisma.merchantNotification.findFirst({
        where: {
          merchantId: booking.merchantId,
          type: 'booking_new',
          metadata: {
            path: ['bookingId'],
            equals: booking.id
          }
        }
      });
      
      if (notification) {
        console.log(`  ✅ Notification found: ${notification.id}`);
        console.log(`     Title: ${notification.title}`);
        console.log(`     Created: ${notification.createdAt}`);
        console.log(`     Read: ${notification.read}`);
        console.log(`     Metadata: ${JSON.stringify(notification.metadata, null, 2)}`);
      } else {
        console.log(`  ❌ No notification found for this booking`);
      }
      console.log('');
    }
    
    // Check merchant settings
    if (bookings.length > 0) {
      const merchantId = bookings[0].merchantId;
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId }
      });
      
      console.log('\nMerchant notification settings:');
      const settings = merchant.settings || {};
      console.log(`  newBookingNotification: ${settings.newBookingNotification !== false ? 'enabled' : 'disabled'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentBookings();