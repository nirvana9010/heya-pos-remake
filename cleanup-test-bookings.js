#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupTestBookings() {
  try {
    console.log('=== CLEANING UP TEST BOOKINGS ===\n');
    
    // Find all unassigned test bookings
    const unassignedTestBookings = await prisma.booking.findMany({
      where: {
        providerId: null,
        customer: {
          OR: [
            { firstName: { contains: 'Test' } },
            { email: { contains: 'test' } }
          ]
        }
      },
      include: {
        customer: true
      }
    });
    
    console.log(`Found ${unassignedTestBookings.length} unassigned test bookings\n`);
    
    if (unassignedTestBookings.length > 0) {
      console.log('These bookings will be deleted:');
      unassignedTestBookings.forEach(booking => {
        console.log(`- ${booking.bookingNumber}: ${booking.customer.firstName} ${booking.customer.lastName} at ${booking.startTime}`);
      });
      
      console.log('\nDeleting unassigned test bookings...');
      
      const deleteResult = await prisma.booking.deleteMany({
        where: {
          id: {
            in: unassignedTestBookings.map(b => b.id)
          }
        }
      });
      
      console.log(`\n✅ Deleted ${deleteResult.count} unassigned test bookings`);
    } else {
      console.log('✅ No unassigned test bookings to clean up');
    }
    
    // Also find old test bookings (older than 24 hours)
    const oldTestBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        customer: {
          OR: [
            { firstName: { contains: 'Test' } },
            { email: { contains: 'test' } }
          ]
        }
      },
      include: {
        customer: true
      }
    });
    
    if (oldTestBookings.length > 0) {
      console.log(`\nFound ${oldTestBookings.length} old test bookings (>24 hours)`);
      console.log('Consider cleaning these up manually if needed.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('This will delete unassigned test bookings. Continue? (y/n) ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    cleanupTestBookings();
  } else {
    console.log('Cleanup cancelled');
    process.exit(0);
  }
  rl.close();
});