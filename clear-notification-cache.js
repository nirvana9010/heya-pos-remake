#!/usr/bin/env node

// This script clears notification-related data from the database
// to help test the notification system with a clean slate

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearNotificationData() {
  try {
    console.log('Clearing notification data...\n');
    
    // Clear all merchant notifications
    const deletedNotifications = await prisma.merchantNotification.deleteMany({});
    console.log(`Deleted ${deletedNotifications.count} merchant notifications`);
    
    // Clear all processed outbox events (keep unprocessed ones)
    const deletedEvents = await prisma.outboxEvent.deleteMany({
      where: {
        processedAt: { not: null }
      }
    });
    console.log(`Deleted ${deletedEvents.count} processed outbox events`);
    
    // Show remaining unprocessed events
    const unprocessedCount = await prisma.outboxEvent.count({
      where: {
        processedAt: null
      }
    });
    console.log(`\nRemaining unprocessed events: ${unprocessedCount}`);
    
    console.log('\nNotification data cleared successfully!');
    console.log('Note: You should also clear browser localStorage for shownBrowserNotifications');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearNotificationData();