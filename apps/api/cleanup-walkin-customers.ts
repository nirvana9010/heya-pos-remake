import { PrismaClient } from '@prisma/client';

async function cleanupWalkInCustomers() {
  const prisma = new PrismaClient();
  
  try {
    // First, find all walk-in customers
    const walkInCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { startsWith: 'Walk-in' } },
          { source: 'WALK_IN' }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${walkInCustomers.length} walk-in customers`);
    
    // Find the proper walk-in customer (no lastName)
    const properWalkIn = walkInCustomers.find(c => 
      c.firstName === 'Walk-in' && (!c.lastName || c.lastName === null)
    );
    
    if (properWalkIn) {
      console.log(`\nKeeping proper walk-in customer: ${properWalkIn.id}`);
      
      // Find customers to delete (walk-ins with date/time in lastName)
      const toDelete = walkInCustomers.filter(c => 
        c.id !== properWalkIn.id && 
        c.firstName === 'Walk-in' && 
        c.lastName && 
        c.lastName !== ''
      );
      
      if (toDelete.length > 0) {
        console.log(`\nDeleting ${toDelete.length} duplicate walk-in customers with date/time suffixes...`);
        
        for (const customer of toDelete) {
          console.log(`  - Deleting: "${customer.firstName}" "${customer.lastName}"`);
          
          // Update any bookings to use the proper walk-in customer
          const updatedBookings = await prisma.booking.updateMany({
            where: { customerId: customer.id },
            data: { customerId: properWalkIn.id }
          });
          
          if (updatedBookings.count > 0) {
            console.log(`    Updated ${updatedBookings.count} bookings`);
          }
          
          // Update any notification logs to use the proper walk-in customer
          const updatedNotifications = await prisma.notificationLog.updateMany({
            where: { customerId: customer.id },
            data: { customerId: properWalkIn.id }
          });
          
          if (updatedNotifications.count > 0) {
            console.log(`    Updated ${updatedNotifications.count} notification logs`);
          }
          
          // Delete the duplicate customer
          await prisma.customer.delete({
            where: { id: customer.id }
          });
        }
        
        console.log('\nCleanup complete!');
      } else {
        console.log('\nNo duplicate walk-in customers to clean up.');
      }
    } else {
      console.log('\nNo proper walk-in customer found. Skipping cleanup.');
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupWalkInCustomers();