#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationFlow() {
  try {
    console.log('Testing notification flow...\n');
    
    // Get a merchant
    const merchant = await prisma.merchant.findFirst({
      where: { status: 'ACTIVE' }
    });
    
    if (!merchant) {
      console.log('No active merchant found');
      return;
    }
    
    console.log(`Using merchant: ${merchant.name} (${merchant.id})`);
    
    // Create a test merchant notification
    const notification = await prisma.merchantNotification.create({
      data: {
        merchantId: merchant.id,
        type: 'booking_new',
        priority: 'important',
        title: 'Test Notification - ' + new Date().toISOString(),
        message: 'This is a test notification created at ' + new Date().toLocaleTimeString(),
        actionUrl: '/bookings',
        actionLabel: 'View booking',
        metadata: {
          bookingId: 'test-' + Date.now(),
          test: true
        }
      }
    });
    
    console.log('\nCreated test notification:');
    console.log(`- ID: ${notification.id}`);
    console.log(`- Title: ${notification.title}`);
    console.log(`- Created: ${notification.createdAt}`);
    
    console.log('\n✅ Test notification created successfully!');
    console.log('Check if it appears in the merchant app within 5 seconds.');
    
    // Check for any unprocessed events
    const unprocessedEvents = await prisma.outboxEvent.count({
      where: {
        processedAt: null,
        retryCount: { lt: 3 }
      }
    });
    
    console.log(`\nUnprocessed outbox events: ${unprocessedEvents}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationFlow();