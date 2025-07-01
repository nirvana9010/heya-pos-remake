#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.zkbdyagbdidmhtixqhtc:Lakshaybhutani2004@@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function monitorEventPublishing() {
  console.log('\n=== Monitoring OutboxEvent Publishing ===\n');
  console.log('This will monitor for 30 seconds to see if events get processed...\n');
  
  try {
    // Get initial unprocessed events
    const unprocessedBefore = await prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: { lt: 3 }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${unprocessedBefore.length} unprocessed events at start:`);
    unprocessedBefore.forEach(event => {
      console.log(`  - ${event.aggregateType}.${event.eventType} (${event.id}) created at ${event.createdAt.toISOString()}`);
    });

    if (unprocessedBefore.length === 0) {
      console.log('\nNo unprocessed events found. Try creating a booking/cancellation first.');
      return;
    }

    // Monitor for 30 seconds
    console.log('\nMonitoring for 30 seconds...');
    
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      console.log(`\n[After ${(i + 1) * 5} seconds]`);
      
      // Check which events got processed
      const stillUnprocessed = await prisma.outboxEvent.findMany({
        where: {
          id: {
            in: unprocessedBefore.map(e => e.id)
          },
          processedAt: null
        }
      });

      const processed = unprocessedBefore.length - stillUnprocessed.length;
      console.log(`  Processed: ${processed}/${unprocessedBefore.length} events`);
      
      if (stillUnprocessed.length > 0) {
        console.log('  Still unprocessed:');
        stillUnprocessed.forEach(event => {
          const age = Math.floor((Date.now() - event.createdAt.getTime()) / 1000);
          console.log(`    - ${event.aggregateType}.${event.eventType} (age: ${age}s, retries: ${event.retryCount})`);
        });
      }

      if (stillUnprocessed.length === 0) {
        console.log('\n✅ All events processed successfully!');
        break;
      }
    }

    // Final check
    const finalUnprocessed = await prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: { lt: 3 }
      }
    });

    if (finalUnprocessed.length > 0) {
      console.log('\n❌ WARNING: Some events are still unprocessed after 30 seconds!');
      console.log('This suggests the OutboxPublisher might not be running correctly.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

monitorEventPublishing();