import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLoyaltyVisits() {
  try {
    console.log('Analyzing loyalty visits data...\n');
    
    // Get all active visit-based loyalty programs
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
      console.log(`\n========================================`);
      console.log(`Merchant: ${program.merchant.name}`);
      console.log(`Program: ${program.name} - ${program.visitsRequired} visits required`);
      console.log(`========================================\n`);
      
      // Get all customers with completed bookings for this merchant
      const customersWithBookings = await prisma.$queryRaw`
        SELECT 
          c.id,
          c."firstName",
          c."lastName",
          c."visitCount",
          c."loyaltyVisits",
          c."lifetimeVisits",
          COUNT(DISTINCT b.id) as completed_bookings,
          COUNT(DISTINCT lt.id) as loyalty_transactions
        FROM "Customer" c
        LEFT JOIN "Booking" b ON c.id = b."customerId" 
          AND b."merchantId" = ${program.merchantId}
          AND b.status IN ('COMPLETED', 'CHECKED_IN')
        LEFT JOIN "LoyaltyTransaction" lt ON c.id = lt."customerId"
          AND lt."merchantId" = ${program.merchantId}
          AND lt.type = 'EARNED'
          AND lt."visitsDelta" > 0
        WHERE c."merchantId" = ${program.merchantId}
        GROUP BY c.id, c."firstName", c."lastName", c."visitCount", c."loyaltyVisits", c."lifetimeVisits"
        HAVING COUNT(DISTINCT b.id) > 0
        ORDER BY COUNT(DISTINCT b.id) DESC
        LIMIT 20
      `;
      
      console.log('Customer Analysis:');
      console.log('Name | Visit Count | Loyalty Visits | Lifetime Visits | Completed Bookings | Loyalty Transactions');
      console.log('-----|-------------|----------------|-----------------|-------------------|--------------------');
      
      const customersToFix = [];
      
      for (const customer of customersWithBookings as any[]) {
        const name = `${customer.firstName} ${customer.lastName || ''}`.trim();
        console.log(
          `${name.padEnd(20)} | ${String(customer.visitCount).padEnd(11)} | ${String(customer.loyaltyVisits).padEnd(14)} | ${String(customer.lifetimeVisits).padEnd(15)} | ${String(customer.completed_bookings).padEnd(17)} | ${customer.loyalty_transactions}`
        );
        
        // If customer has completed bookings but no loyalty visits/transactions
        if (Number(customer.completed_bookings) > 0 && Number(customer.loyaltyVisits) === 0 && Number(customer.loyalty_transactions) === 0) {
          customersToFix.push(customer);
        }
      }
      
      if (customersToFix.length > 0) {
        console.log(`\n\nFound ${customersToFix.length} customers who need loyalty visits added`);
        console.log('These customers have completed bookings but no loyalty visits recorded.\n');
        
        // Process each customer
        for (const customer of customersToFix) {
          // Get their completed bookings
          const bookings = await prisma.booking.findMany({
            where: {
              customerId: customer.id,
              merchantId: program.merchantId,
              status: { in: ['COMPLETED', 'CHECKED_IN'] }
            },
            orderBy: {
              completedAt: 'asc'
            }
          });
          
          console.log(`\nProcessing ${customer.firstName} ${customer.lastName || ''} - ${bookings.length} bookings`);
          
          let visitsToAdd = 0;
          
          for (const booking of bookings) {
            // Check if this booking already has a loyalty transaction
            const existingTransaction = await prisma.loyaltyTransaction.findFirst({
              where: {
                bookingId: booking.id,
                type: 'EARNED',
                visitsDelta: { gt: 0 }
              }
            });
            
            if (!existingTransaction) {
              // Create loyalty transaction
              await prisma.loyaltyTransaction.create({
                data: {
                  customerId: customer.id,
                  merchantId: program.merchantId,
                  bookingId: booking.id,
                  type: 'EARNED',
                  visitsDelta: 1,
                  description: 'Visit earned from booking (retroactive sync)',
                  createdByStaffId: booking.createdById
                }
              });
              
              visitsToAdd++;
              console.log(`  ✓ Added loyalty transaction for booking ${booking.bookingNumber}`);
            } else {
              console.log(`  - Booking ${booking.bookingNumber} already has loyalty transaction`);
            }
          }
          
          if (visitsToAdd > 0) {
            // Update customer loyalty visits
            const updatedCustomer = await prisma.customer.update({
              where: { id: customer.id },
              data: {
                loyaltyVisits: { increment: visitsToAdd }
              }
            });
            
            console.log(`  → Updated ${customer.firstName}'s loyalty visits: ${customer.loyaltyVisits} → ${updatedCustomer.loyaltyVisits}`);
          }
        }
      }
      
      // Also fix visitCount mismatches
      console.log('\n\nChecking for visitCount mismatches...');
      
      const mismatchedCustomers = await prisma.$queryRaw`
        SELECT 
          c.id,
          c."firstName",
          c."lastName",
          c."visitCount",
          COUNT(DISTINCT b.id) as actual_bookings
        FROM "Customer" c
        LEFT JOIN "Booking" b ON c.id = b."customerId" 
          AND b."merchantId" = ${program.merchantId}
          AND b.status IN ('COMPLETED', 'CHECKED_IN')
        WHERE c."merchantId" = ${program.merchantId}
          AND c."visitCount" > 0
        GROUP BY c.id, c."firstName", c."lastName", c."visitCount"
        HAVING COUNT(DISTINCT b.id) != c."visitCount"
      `;
      
      if (Array.isArray(mismatchedCustomers) && mismatchedCustomers.length > 0) {
        console.log(`Found ${mismatchedCustomers.length} customers with incorrect visitCount`);
        
        for (const customer of mismatchedCustomers as any[]) {
          const actualCount = Number(customer.actual_bookings);
          await prisma.customer.update({
            where: { id: customer.id },
            data: { 
              visitCount: actualCount,
              lifetimeVisits: actualCount
            }
          });
          
          console.log(`✓ Fixed ${customer.firstName} ${customer.lastName || ''}: visitCount ${customer.visitCount} → ${actualCount}`);
        }
      }
    }
    
    console.log('\n\n✅ Loyalty visits sync complete!');
    
  } catch (error) {
    console.error('Error during loyalty sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixLoyaltyVisits();