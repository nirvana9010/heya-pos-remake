#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingInDatabase() {
  try {
    // Get the most recent booking
    const recentBooking = await prisma.booking.findFirst({
      where: {
        customer: {
          OR: [
            { firstName: { contains: 'Test' } },
            { lastName: { contains: 'Test' } }
          ]
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: true,
        provider: true,
        services: {
          include: {
            service: true,
            staff: true
          }
        }
      }
    });

    if (!recentBooking) {
      console.log('No test bookings found');
      return;
    }

    console.log('=== DATABASE BOOKING STATE ===');
    console.log('Booking ID:', recentBooking.id);
    console.log('Customer:', `${recentBooking.customer.firstName} ${recentBooking.customer.lastName}`);
    console.log('Created:', recentBooking.createdAt);
    console.log('\nProvider Assignment:');
    console.log('- providerId (DB field):', recentBooking.providerId || 'NULL');
    console.log('- provider name:', recentBooking.provider ? 
      `${recentBooking.provider.firstName} ${recentBooking.provider.lastName}` : 'UNASSIGNED');
    
    console.log('\nServices:');
    recentBooking.services.forEach((bs, i) => {
      console.log(`Service ${i+1}:`, bs.service.name);
      console.log('- staffId in bookingService:', bs.staffId || 'NULL');
      console.log('- staff assigned:', bs.staff ? 
        `${bs.staff.firstName} ${bs.staff.lastName}` : 'NONE');
    });

    console.log('\n=== COLUMN PLACEMENT ===');
    if (recentBooking.providerId) {
      console.log(`✓ This booking appears in: ${recentBooking.provider.firstName} ${recentBooking.provider.lastName} column`);
    } else {
      console.log('✗ This booking appears in: UNASSIGNED column');
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingInDatabase();