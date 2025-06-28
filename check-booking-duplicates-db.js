#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicateBookingsInDB() {
  try {
    console.log('=== CHECKING DATABASE FOR BOOKING ISSUES ===\n');
    
    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        provider: true,
        customer: true,
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(`Found ${recentBookings.length} bookings from the last 24 hours\n`);
    
    // Group by booking number to check for actual duplicates
    const byBookingNumber = {};
    recentBookings.forEach(booking => {
      if (!byBookingNumber[booking.bookingNumber]) {
        byBookingNumber[booking.bookingNumber] = [];
      }
      byBookingNumber[booking.bookingNumber].push(booking);
    });
    
    // Check for duplicate booking numbers
    let duplicatesFound = false;
    Object.entries(byBookingNumber).forEach(([number, bookings]) => {
      if (bookings.length > 1) {
        duplicatesFound = true;
        console.log(`⚠️  DUPLICATE BOOKING NUMBER: ${number}`);
        bookings.forEach(booking => {
          console.log(`  - ID: ${booking.id}`);
          console.log(`    Provider: ${booking.providerId} (${booking.provider?.firstName || 'None'})`);
          console.log(`    Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
          console.log(`    Created: ${booking.createdAt}`);
        });
      }
    });
    
    if (!duplicatesFound) {
      console.log('✅ No duplicate booking numbers found\n');
    }
    
    // Check for bookings with null providerId
    const unassignedBookings = recentBookings.filter(b => !b.providerId);
    console.log(`📊 Bookings with null providerId: ${unassignedBookings.length}`);
    
    if (unassignedBookings.length > 0) {
      console.log('\nUnassigned booking details:');
      unassignedBookings.forEach(booking => {
        console.log(`\n- Booking #${booking.bookingNumber}`);
        console.log(`  ID: ${booking.id}`);
        console.log(`  Customer: ${booking.customer.firstName} ${booking.customer.lastName}`);
        console.log(`  Created: ${booking.createdAt}`);
        console.log(`  Provider ID: ${booking.providerId || 'NULL'}`);
        console.log(`  Created By ID: ${booking.createdById}`);
      });
    }
    
    // Check for test bookings
    const testBookings = recentBookings.filter(b => 
      b.customer.firstName.includes('Test') || 
      b.customer.email.includes('test')
    );
    
    console.log(`\n🧪 Test bookings found: ${testBookings.length}`);
    testBookings.forEach(booking => {
      console.log(`\n- ${booking.customer.firstName} ${booking.customer.lastName}`);
      console.log(`  ID: ${booking.id}`);
      console.log(`  Booking #: ${booking.bookingNumber}`);
      console.log(`  Provider: ${booking.providerId ? `${booking.provider.firstName} ${booking.provider.lastName}` : 'UNASSIGNED'}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Time: ${booking.startTime}`);
    });
    
    // Check for any booking that might appear twice due to weird join issues
    console.log('\n🔍 Checking for potential visual duplicates...');
    
    // Get all bookings for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: today,
          lt: dayAfterTomorrow
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      select: {
        id: true,
        bookingNumber: true,
        providerId: true,
        startTime: true,
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log(`\nUpcoming bookings (today/tomorrow): ${upcomingBookings.length}`);
    
    // Find bookings at the same time that might visually duplicate
    const bookingsByTime = {};
    upcomingBookings.forEach(booking => {
      const timeKey = booking.startTime.toISOString();
      if (!bookingsByTime[timeKey]) {
        bookingsByTime[timeKey] = [];
      }
      bookingsByTime[timeKey].push(booking);
    });
    
    Object.entries(bookingsByTime).forEach(([time, bookings]) => {
      if (bookings.length > 1) {
        // Check if any have same customer name (might appear as duplicates)
        const customerNames = bookings.map(b => `${b.customer.firstName} ${b.customer.lastName}`);
        const duplicateNames = customerNames.filter((name, index) => customerNames.indexOf(name) !== index);
        
        if (duplicateNames.length > 0) {
          console.log(`\n⚠️  Multiple bookings at ${new Date(time).toLocaleString()} with same customer:`);
          bookings.forEach(booking => {
            const name = `${booking.customer.firstName} ${booking.customer.lastName}`;
            if (duplicateNames.includes(name)) {
              console.log(`  - ID: ${booking.id}, Provider: ${booking.providerId || 'UNASSIGNED'}, Customer: ${name}`);
            }
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateBookingsInDB();