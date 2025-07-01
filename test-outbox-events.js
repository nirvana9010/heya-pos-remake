#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.zkbdyagbdidmhtixqhtc:Lakshaybhutani2004@@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function checkOutboxEvents() {
  console.log('\n=== Testing OutboxEvent Creation ===\n');
  
  try {
    // Get recent outbox events
    const recentEvents = await prisma.outboxEvent.findMany({
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

    console.log(`Found ${recentEvents.length} OutboxEvents in the last 10 minutes:\n`);
    
    // Group by event type
    const eventTypes = {};
    recentEvents.forEach(event => {
      const key = `${event.aggregateType}.${event.eventType}`;
      eventTypes[key] = (eventTypes[key] || 0) + 1;
    });

    console.log('Event Types:');
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} events`);
    });

    // Show detailed info for each event
    console.log('\nDetailed Events:');
    recentEvents.forEach(event => {
      console.log(`\n[${event.createdAt.toISOString()}] ${event.aggregateType}.${event.eventType}`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Aggregate ID: ${event.aggregateId}`);
      console.log(`  Merchant ID: ${event.merchantId}`);
      console.log(`  Processed: ${event.processedAt ? 'YES at ' + event.processedAt.toISOString() : 'NO'}`);
      console.log(`  Retry Count: ${event.retryCount}`);
      if (event.error) {
        console.log(`  Error: ${event.error}`);
      }
      console.log(`  Event Data:`, JSON.stringify(event.eventData, null, 2));
    });

    // Check for unprocessed events
    const unprocessedEvents = await prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: { lt: 3 }
      }
    });

    console.log(`\n\nUnprocessed Events: ${unprocessedEvents.length}`);
    if (unprocessedEvents.length > 0) {
      console.log('These events should be processed within 5 seconds by OutboxPublisher');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('Database URL:', process.env.DATABASE_URL ? 'Using environment variable' : 'Using hardcoded URL');
checkOutboxEvents();