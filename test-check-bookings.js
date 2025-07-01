#\!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.zkbdyagbdidmhtixqhtc:Lakshaybhutani2004@@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function checkBookings() {
  try {
    // Get all bookings from today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: todayStart
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: true
      }
    });
    
    console.log(`\nFound ${bookings.length} bookings created today:\n`);
    
    bookings.forEach((b, i) => {
      console.log(`${i + 1}. ${b.bookingNumber} - ${b.status}`);
      console.log(`   Customer: ${b.customer.firstName} ${b.customer.lastName}`);
      console.log(`   Created: ${b.createdAt.toISOString()}`);
      console.log(`   ID: ${b.id}\n`);
    });
    
    // Check for NEW status bookings
    const newBookings = bookings.filter(b => b.status === 'NEW');
    console.log(`\nNEW bookings: ${newBookings.length}`);
    
    if (newBookings.length > 0) {
      console.log('\nChecking OutboxEvents for NEW bookings:');
      for (const booking of newBookings) {
        const events = await prisma.outboxEvent.findMany({
          where: { aggregateId: booking.id }
        });
        console.log(`\n${booking.bookingNumber}: ${events.length} OutboxEvents`);
        events.forEach(e => {
          console.log(`  - ${e.aggregateType}.${e.eventType} (${e.processedAt ? 'PROCESSED' : 'PENDING'})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
