import { PrismaClient } from '@prisma/client';
import { LoyaltyService } from '../src/loyalty/loyalty.service';

const prisma = new PrismaClient();

async function syncLoyaltyVisits() {
  try {
    console.log('Starting loyalty visits sync...\n');
    
    // Get all active loyalty programs of type VISITS
    const visitPrograms = await prisma.loyaltyProgram.findMany({
      where: {
        isActive: true,
        type: 'VISITS'
      },
      include: {
        merchant: true
      }
    });
    
    console.log(`Found ${visitPrograms.length} active visit-based loyalty programs\n`);
    
    for (const program of visitPrograms) {
      console.log(`\nProcessing merchant: ${program.merchant.name} (${program.merchantId})`);
      console.log(`Program: ${program.name} - ${program.visitsRequired} visits required`);
      
      // Get all completed bookings that don't have loyalty transactions
      const completedBookingsWithoutLoyalty = await prisma.booking.findMany({
        where: {
          merchantId: program.merchantId,
          status: { in: ['COMPLETED', 'CHECKED_IN'] },
          loyaltyTransactions: {
            none: {}
          }
        },
        include: {
          customer: true
        },
        orderBy: {
          completedAt: 'asc'
        }
      });
      
      console.log(`Found ${completedBookingsWithoutLoyalty.length} completed bookings without loyalty transactions`);
      
      let processedCount = 0;
      let errorCount = 0;
      
      for (const booking of completedBookingsWithoutLoyalty) {
        try {
          // Check if customer already has loyalty visits that need to be reset
          const customer = booking.customer;
          
          // Create loyalty service instance
          const loyaltyService = new LoyaltyService(prisma);
          
          // Process the booking
          await loyaltyService.processBookingCompletion(booking.id);
          
          processedCount++;
          console.log(`✓ Processed booking ${booking.bookingNumber} for ${customer.firstName} ${customer.lastName || ''}`);
          
        } catch (error) {
          errorCount++;
          console.error(`✗ Error processing booking ${booking.bookingNumber}:`, error.message);
        }
      }
      
      console.log(`\nSummary for ${program.merchant.name}:`);
      console.log(`- Processed: ${processedCount} bookings`);
      console.log(`- Errors: ${errorCount} bookings`);
      
      // Show updated customer loyalty stats
      const topCustomers = await prisma.customer.findMany({
        where: {
          merchantId: program.merchantId,
          loyaltyVisits: { gt: 0 }
        },
        orderBy: {
          loyaltyVisits: 'desc'
        },
        take: 5
      });
      
      if (topCustomers.length > 0) {
        console.log('\nTop customers by loyalty visits:');
        for (const customer of topCustomers) {
          console.log(`- ${customer.firstName} ${customer.lastName || ''}: ${customer.loyaltyVisits} visits`);
        }
      }
    }
    
    // Reset visitCount for customers where it doesn't match actual bookings
    console.log('\n\nChecking for visitCount mismatches...');
    
    const customersWithMismatch = await prisma.$queryRaw`
      SELECT 
        c.id,
        c."firstName",
        c."lastName",
        c."visitCount",
        c."loyaltyVisits",
        COUNT(DISTINCT b.id) as actual_bookings
      FROM "Customer" c
      LEFT JOIN "Booking" b ON c.id = b."customerId" 
        AND b.status IN ('COMPLETED', 'CHECKED_IN')
      WHERE c."visitCount" > 0
      GROUP BY c.id, c."firstName", c."lastName", c."visitCount", c."loyaltyVisits"
      HAVING COUNT(DISTINCT b.id) != c."visitCount"
      LIMIT 20
    `;
    
    if (Array.isArray(customersWithMismatch) && customersWithMismatch.length > 0) {
      console.log(`\nFound ${customersWithMismatch.length} customers with mismatched visit counts`);
      console.log('\nWould you like to fix these mismatches? (This script is read-only by default)');
      console.log('To fix, uncomment the update code below and run again.');
      
      for (const customer of customersWithMismatch as any[]) {
        console.log(`- ${customer.firstName} ${customer.lastName || ''}: visitCount=${customer.visitCount}, actual=${customer.actual_bookings}`);
        
        // Uncomment to fix:
        // await prisma.customer.update({
        //   where: { id: customer.id },
        //   data: { visitCount: Number(customer.actual_bookings) }
        // });
      }
    }
    
    console.log('\n\nLoyalty sync complete!');
    
  } catch (error) {
    console.error('Error during loyalty sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncLoyaltyVisits();