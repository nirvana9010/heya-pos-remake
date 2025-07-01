#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.zkbdyagbdidmhtixqhtc:Lakshaybhutani2004@@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function testFullJourney() {
  console.log('\n=== Testing Full Notification Journey ===\n');
  console.log('This test tracks the complete flow from action → OutboxEvent → Event Handler → Notification\n');
  
  try {
    // Get a sample merchant ID
    const merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      console.log('No merchant found in database');
      return;
    }
    
    console.log(`Using merchant: ${merchant.name} (${merchant.id})\n`);
    
    // Monitor function
    async function checkNotificationCreation(actionName, bookingId, waitTime = 10000) {
      console.log(`\n--- Testing ${actionName} ---`);
      console.log(`Booking ID: ${bookingId}`);
      console.log(`Waiting ${waitTime/1000} seconds for notification flow...\n`);
      
      const startTime = Date.now();
      
      // Check initial state
      const outboxBefore = await prisma.outboxEvent.count({
        where: { aggregateId: bookingId }
      });
      
      const notifsBefore = await prisma.merchantNotification.count({
        where: { 
          merchantId: merchant.id,
          metadata: {
            path: ['bookingId'],
            equals: bookingId
          }
        }
      });
      
      console.log(`Before: ${outboxBefore} OutboxEvents, ${notifsBefore} Notifications`);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Check final state
      const outboxEvents = await prisma.outboxEvent.findMany({
        where: { aggregateId: bookingId },
        orderBy: { createdAt: 'desc' }
      });
      
      const notifications = await prisma.merchantNotification.findMany({
        where: { 
          merchantId: merchant.id,
          metadata: {
            path: ['bookingId'],
            equals: bookingId
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`\nAfter ${waitTime/1000}s:`);
      console.log(`  OutboxEvents: ${outboxEvents.length}`);
      console.log(`  Notifications: ${notifications.length}`);
      
      // Show OutboxEvent details
      if (outboxEvents.length > 0) {
        const latest = outboxEvents[0];
        console.log(`\n  Latest OutboxEvent:`);
        console.log(`    Type: ${latest.aggregateType}.${latest.eventType}`);
        console.log(`    Created: ${latest.createdAt.toISOString()}`);
        console.log(`    Processed: ${latest.processedAt ? latest.processedAt.toISOString() : 'NO'}`);
        console.log(`    Processing time: ${latest.processedAt ? (latest.processedAt.getTime() - latest.createdAt.getTime()) + 'ms' : 'N/A'}`);
      }
      
      // Show notification details
      if (notifications.length > 0) {
        const latest = notifications[0];
        console.log(`\n  Latest Notification:`);
        console.log(`    Type: ${latest.type}`);
        console.log(`    Title: ${latest.title}`);
        console.log(`    Message: ${latest.message}`);
        console.log(`    Created: ${latest.createdAt.toISOString()}`);
      }
      
      // Verdict
      const success = outboxEvents.length > 0 && 
                     outboxEvents[0].processedAt && 
                     notifications.length > notifsBefore;
      
      console.log(`\n  Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (!success) {
        if (outboxEvents.length === 0) {
          console.log('    - No OutboxEvent created');
        } else if (!outboxEvents[0].processedAt) {
          console.log('    - OutboxEvent not processed');
        }
        if (notifications.length === notifsBefore) {
          console.log('    - No notification created');
        }
      }
      
      return success;
    }
    
    // Test 1: Find recent bookings
    console.log('=== Step 1: Finding Recent Bookings ===');
    
    const recentBookings = await prisma.booking.findMany({
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: true,
        services: {
          include: {
            service: true
          }
        }
      }
    });
    
    console.log(`Found ${recentBookings.length} recent bookings`);
    
    if (recentBookings.length === 0) {
      console.log('\nNo recent bookings found. Create some bookings first!');
      return;
    }
    
    // Show recent booking statuses
    console.log('\nRecent bookings:');
    recentBookings.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.bookingNumber} - ${b.status} (${b.customer.firstName} ${b.customer.lastName})`);
    });
    
    // Test 2: Check notification creation for different statuses
    console.log('\n\n=== Step 2: Checking Notification Creation ===');
    
    for (const booking of recentBookings.slice(0, 3)) {
      await checkNotificationCreation(
        `Booking ${booking.status}`,
        booking.id,
        8000 // Wait 8 seconds
      );
    }
    
    // Summary
    console.log('\n\n=== SUMMARY ===');
    console.log('If notifications are not being created:');
    console.log('1. Check that OutboxPublisher is running (pm2 logs api)');
    console.log('2. Check event handler logs for errors');
    console.log('3. Verify event names match (booking.created, booking.cancelled, booking.completed)');
    console.log('4. Check that merchant notifications service is working');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullJourney();