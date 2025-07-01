#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.zkbdyagbdidmhtixqhtc:Lakshaybhutani2004@@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function checkEventHandlers() {
  console.log('\n=== Testing Event Handlers & Merchant Notifications ===\n');
  
  try {
    // Get recent merchant notifications
    const recentNotifications = await prisma.merchantNotification.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log(`Found ${recentNotifications.length} Merchant Notifications in the last 10 minutes:\n`);
    
    // Group by type
    const notificationTypes = {};
    recentNotifications.forEach(notif => {
      notificationTypes[notif.type] = (notificationTypes[notif.type] || 0) + 1;
    });

    console.log('Notification Types:');
    Object.entries(notificationTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} notifications`);
    });

    // Check correlation with OutboxEvents
    console.log('\n\nChecking Event → Notification correlation:');
    
    const processedEvents = await prisma.outboxEvent.findMany({
      where: {
        processedAt: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\nProcessed OutboxEvents: ${processedEvents.length}`);
    
    // Map events to expected notifications
    const eventToNotificationType = {
      'booking.created': 'booking_new',
      'booking.cancelled': 'booking_cancelled', 
      'booking.completed': 'booking_modified',
      'booking.modified': 'booking_modified'
    };

    processedEvents.forEach(event => {
      const eventType = `${event.aggregateType}.${event.eventType}`;
      const expectedNotifType = eventToNotificationType[eventType];
      
      if (expectedNotifType) {
        // Try to find corresponding notification
        const bookingId = event.eventData.bookingId;
        const notification = recentNotifications.find(n => 
          n.metadata && n.metadata.bookingId === bookingId
        );

        console.log(`\n${eventType} (${event.aggregateId}):`);
        console.log(`  Expected notification type: ${expectedNotifType}`);
        console.log(`  Found notification: ${notification ? 'YES' : 'NO'}`);
        
        if (notification) {
          console.log(`  Notification details:`);
          console.log(`    - Type: ${notification.type}`);
          console.log(`    - Title: ${notification.title}`);
          console.log(`    - Message: ${notification.message}`);
          console.log(`    - Created: ${notification.createdAt.toISOString()}`);
        }
      }
    });

    // Show detailed notifications
    console.log('\n\nDetailed Recent Notifications:');
    recentNotifications.slice(0, 5).forEach(notif => {
      console.log(`\n[${notif.createdAt.toISOString()}] ${notif.type}`);
      console.log(`  Title: ${notif.title}`);
      console.log(`  Message: ${notif.message}`);
      console.log(`  Read: ${notif.read ? 'YES' : 'NO'}`);
      console.log(`  Metadata:`, JSON.stringify(notif.metadata, null, 2));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEventHandlers();