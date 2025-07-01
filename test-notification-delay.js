#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotificationDelay() {
  try {
    console.log('Checking notification delay...\n');
    
    // 1. Check unprocessed OutboxEvents
    const unprocessedEvents = await prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: { lt: 3 }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        createdAt: true,
        retryCount: true,
        lastError: true,
        merchantId: true
      }
    });
    
    console.log(`Found ${unprocessedEvents.length} unprocessed events:`);
    if (unprocessedEvents.length > 0) {
      const now = new Date();
      unprocessedEvents.forEach(event => {
        const ageInSeconds = Math.floor((now - event.createdAt) / 1000);
        console.log(`- ${event.aggregateType}.${event.eventType} created ${ageInSeconds}s ago, retries: ${event.retryCount}`);
        if (event.lastError) {
          console.log(`  Error: ${event.lastError}`);
        }
      });
    }
    
    // 2. Check recent processed events
    console.log('\nRecent processed events:');
    const processedEvents = await prisma.outboxEvent.findMany({
      where: {
        processedAt: { not: null }
      },
      orderBy: { processedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        createdAt: true,
        processedAt: true,
        merchantId: true
      }
    });
    
    processedEvents.forEach(event => {
      const processingTime = Math.floor((event.processedAt - event.createdAt) / 1000);
      console.log(`- ${event.aggregateType}.${event.eventType} processed in ${processingTime}s`);
    });
    
    // 3. Check recent merchant notifications
    console.log('\nRecent merchant notifications:');
    const notifications = await prisma.merchantNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        merchantId: true,
        metadata: true
      }
    });
    
    notifications.forEach(notif => {
      const ageInSeconds = Math.floor((new Date() - notif.createdAt) / 1000);
      console.log(`- ${notif.type}: "${notif.title}" created ${ageInSeconds}s ago`);
      if (notif.metadata?.bookingId) {
        console.log(`  Booking ID: ${notif.metadata.bookingId}`);
      }
    });
    
    // 4. Check for stuck events (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stuckEvents = await prisma.outboxEvent.count({
      where: {
        processedAt: null,
        createdAt: { lt: fiveMinutesAgo },
        retryCount: { lt: 3 }
      }
    });
    
    if (stuckEvents > 0) {
      console.log(`\n⚠️  WARNING: ${stuckEvents} events are stuck (older than 5 minutes and unprocessed)`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotificationDelay();