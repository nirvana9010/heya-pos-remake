const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseDelay() {
  console.log('\n=== NOTIFICATION DELAY DIAGNOSIS ===\n');
  
  // 1. Check for recent bookings
  const recentBookings = await prisma.booking.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
      },
      source: 'ONLINE'
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      merchant: true
    }
  });
  
  console.log(`Found ${recentBookings.length} online bookings in last 30 minutes:\n`);
  
  for (const booking of recentBookings) {
    console.log(`Booking ${booking.bookingNumber}:`);
    console.log(`  Created: ${booking.createdAt}`);
    console.log(`  Time since creation: ${Math.round((Date.now() - booking.createdAt.getTime()) / 1000)}s`);
    
    // 2. Check if notification exists
    const notification = await prisma.merchantNotification.findFirst({
      where: {
        merchantId: booking.merchantId,
        metadata: {
          path: ['bookingId'],
          equals: booking.id
        }
      }
    });
    
    if (notification) {
      console.log(`  ✅ Notification found:`);
      console.log(`     Created: ${notification.createdAt}`);
      console.log(`     Delay: ${Math.round((notification.createdAt.getTime() - booking.createdAt.getTime()) / 1000)}s`);
      console.log(`     Type: ${notification.type}`);
      console.log(`     Read: ${notification.read}`);
    } else {
      console.log(`  ❌ No notification found`);
    }
    
    // 3. Check OutboxEvent
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: booking.id,
        eventType: 'created'
      }
    });
    
    if (outboxEvent) {
      console.log(`  📦 Outbox event:`);
      console.log(`     Created: ${outboxEvent.createdAt}`);
      console.log(`     Processed: ${outboxEvent.processedAt || 'NOT YET'}`);
      if (outboxEvent.processedAt) {
        const processingDelay = (outboxEvent.processedAt.getTime() - outboxEvent.createdAt.getTime()) / 1000;
        console.log(`     Processing delay: ${Math.round(processingDelay)}s`);
      }
      console.log(`     Retry count: ${outboxEvent.retryCount}`);
    }
    
    // 4. Check merchant settings
    const settings = booking.merchant.settings || {};
    console.log(`  🔧 Merchant settings:`);
    console.log(`     newBookingNotification: ${settings.newBookingNotification !== false}`);
    
    console.log('');
  }
  
  // 5. Check OutboxPublisher status
  console.log('\n=== OUTBOX PUBLISHER STATUS ===\n');
  const unprocessedEvents = await prisma.outboxEvent.count({
    where: {
      processedAt: null,
      retryCount: { lt: 3 }
    }
  });
  
  console.log(`Unprocessed outbox events: ${unprocessedEvents}`);
  
  // Get recent outbox events
  const recentOutboxEvents = await prisma.outboxEvent.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`\nRecent outbox events (last 10 minutes):`);
  recentOutboxEvents.forEach(event => {
    const processingTime = event.processedAt 
      ? `${Math.round((event.processedAt.getTime() - event.createdAt.getTime()) / 1000)}s`
      : 'NOT PROCESSED';
    console.log(`  ${event.eventType} - Created: ${event.createdAt.toLocaleTimeString()} - Processing time: ${processingTime}`);
  });
  
  await prisma.$disconnect();
}

diagnoseDelay().catch(console.error);