#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeNotificationTimeline() {
  try {
    console.log('Analyzing notification timeline...\n');
    
    // Get the most recent booking
    const recentBooking = await prisma.booking.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookingNumber: true,
        createdAt: true,
        status: true,
        merchantId: true
      }
    });
    
    if (!recentBooking) {
      console.log('No bookings found');
      return;
    }
    
    console.log(`Most recent booking: ${recentBooking.bookingNumber}`);
    console.log(`Created: ${recentBooking.createdAt}`);
    console.log(`Status: ${recentBooking.status}\n`);
    
    // Find related outbox event
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: recentBooking.id,
        aggregateType: 'booking'
      },
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        processedAt: true,
        retryCount: true,
        lastError: true
      }
    });
    
    if (outboxEvent) {
      console.log('Related OutboxEvent:');
      console.log(`- Event Type: ${outboxEvent.eventType}`);
      console.log(`- Created: ${outboxEvent.createdAt}`);
      console.log(`- Processed: ${outboxEvent.processedAt || 'NOT PROCESSED'}`);
      if (outboxEvent.processedAt) {
        const processingDelay = (outboxEvent.processedAt - outboxEvent.createdAt) / 1000;
        console.log(`- Processing delay: ${processingDelay}s`);
      }
      console.log(`- Retry count: ${outboxEvent.retryCount}`);
      if (outboxEvent.lastError) {
        console.log(`- Last error: ${outboxEvent.lastError}`);
      }
    }
    
    // Find related merchant notification
    const merchantNotification = await prisma.merchantNotification.findFirst({
      where: {
        merchantId: recentBooking.merchantId,
        metadata: {
          path: ['bookingId'],
          equals: recentBooking.id
        }
      },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        read: true
      }
    });
    
    if (merchantNotification) {
      console.log('\nRelated MerchantNotification:');
      console.log(`- Type: ${merchantNotification.type}`);
      console.log(`- Title: ${merchantNotification.title}`);
      console.log(`- Created: ${merchantNotification.createdAt}`);
      console.log(`- Read: ${merchantNotification.read}`);
      
      if (outboxEvent?.processedAt) {
        const notificationDelay = (merchantNotification.createdAt - outboxEvent.processedAt) / 1000;
        console.log(`- Delay after event processing: ${notificationDelay}s`);
      }
      
      const totalDelay = (merchantNotification.createdAt - recentBooking.createdAt) / 1000;
      console.log(`- Total delay from booking creation: ${totalDelay}s (${Math.floor(totalDelay / 60)}m ${Math.floor(totalDelay % 60)}s)`);
    } else {
      console.log('\nNo merchant notification found for this booking');
    }
    
    // Check if there are any duplicate notifications
    const duplicates = await prisma.merchantNotification.findMany({
      where: {
        merchantId: recentBooking.merchantId,
        metadata: {
          path: ['bookingId'],
          equals: recentBooking.id
        }
      },
      select: {
        id: true,
        type: true,
        createdAt: true
      }
    });
    
    if (duplicates.length > 1) {
      console.log(`\n⚠️  WARNING: Found ${duplicates.length} duplicate notifications for this booking!`);
      duplicates.forEach((dup, index) => {
        console.log(`  ${index + 1}. ${dup.type} created at ${dup.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeNotificationTimeline();