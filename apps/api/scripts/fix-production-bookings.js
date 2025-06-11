const { PrismaClient } = require('@prisma/client');

// Use the production database connection
const prisma = new PrismaClient();

async function fixProductionBookings() {
  console.log('🚀 Fixing production booking data on Supabase...\n');

  try {
    // First, let's see what we're dealing with
    console.log('📊 Current booking statistics:');
    const bookingCount = await prisma.booking.count();
    console.log(`   Total bookings: ${bookingCount}`);
    
    // Get booking distribution by date
    const bookings = await prisma.booking.findMany({
      select: {
        id: true,
        startTime: true,
        endTime: true,
        providerId: true,
        status: true,
        totalAmount: true
      },
      orderBy: { startTime: 'asc' }
    });

    // Group by date to see the problem
    const bookingsByDate = {};
    bookings.forEach(b => {
      const date = b.startTime.toISOString().split('T')[0];
      if (!bookingsByDate[date]) {
        bookingsByDate[date] = [];
      }
      bookingsByDate[date].push(b);
    });

    console.log('\n📅 Bookings by date:');
    Object.entries(bookingsByDate).forEach(([date, bookings]) => {
      console.log(`   ${date}: ${bookings.length} bookings`);
    });

    // Find the problematic date (June 4th with 105 bookings)
    const problematicDate = Object.entries(bookingsByDate)
      .find(([date, bookings]) => bookings.length > 50);

    if (problematicDate) {
      console.log(`\n⚠️  Found problematic date: ${problematicDate[0]} with ${problematicDate[1].length} bookings`);
      console.log('   This needs to be redistributed across multiple days.');
      
      // Delete all bookings to start fresh
      console.log('\n🗑️  Deleting all existing bookings...');
      await prisma.bookingService.deleteMany({});
      await prisma.booking.deleteMany({});
      console.log('   ✓ All bookings deleted');

      // Get merchant data
      const merchantAuth = await prisma.merchantAuth.findFirst({
        where: { username: 'HAMILTON' },
        include: { 
          merchant: {
            include: {
              locations: true,
              staff: true,
              services: true,
              customers: true
            }
          }
        }
      });

      if (!merchantAuth?.merchant) {
        throw new Error('Hamilton merchant not found');
      }

      const merchant = merchantAuth.merchant;
      const location = merchant.locations[0];
      const staff = merchant.staff;
      const services = merchant.services.filter(s => s.isActive);
      const customers = merchant.customers.slice(0, 50); // Use first 50 customers

      console.log(`\n📋 Found: ${staff.length} staff, ${services.length} services, ${customers.length} customers`);

      // Create realistic bookings
      console.log('\n📅 Creating properly distributed bookings...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let totalCreated = 0;
      
      // Create bookings for 14 days (7 past, 7 future)
      for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        const dayOfWeek = currentDate.getDay();
        
        // Skip or reduce bookings on Sundays
        if (dayOfWeek === 0 && Math.random() < 0.5) continue;
        
        // Determine number of bookings for this day
        let targetBookings;
        if (dayOfWeek === 0) {
          targetBookings = Math.floor(Math.random() * 3) + 2; // 2-4 bookings on Sunday
        } else if (dayOfWeek === 6) {
          targetBookings = Math.floor(Math.random() * 6) + 8; // 8-13 bookings on Saturday
        } else {
          targetBookings = Math.floor(Math.random() * 5) + 5; // 5-9 bookings on weekdays
        }
        
        const dateStr = currentDate.toISOString().split('T')[0];
        console.log(`   ${dateStr}: Creating ${targetBookings} bookings...`);
        
        // Create bookings throughout the day
        for (let i = 0; i < targetBookings; i++) {
          // Random time between 9 AM and 6 PM
          const hour = 9 + Math.floor(Math.random() * 9);
          const minute = Math.random() < 0.5 ? 0 : 30;
          
          const startTime = new Date(currentDate);
          startTime.setHours(hour, minute, 0, 0);
          
          const service = services[Math.floor(Math.random() * services.length)];
          const staffMember = staff[Math.floor(Math.random() * staff.length)];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + service.duration);
          
          // Determine status based on date
          let status = 'CONFIRMED';
          if (currentDate < today) {
            status = Math.random() < 0.8 ? 'COMPLETED' : 'CANCELLED';
          } else if (currentDate.toDateString() === today.toDateString() && startTime < new Date()) {
            status = 'COMPLETED';
          }
          
          try {
            const booking = await prisma.booking.create({
              data: {
                merchantId: merchant.id,
                locationId: location.id,
                customerId: customer.id,
                providerId: staffMember.id,
                createdById: staffMember.id,
                bookingNumber: `BK${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                startTime: startTime,
                endTime: endTime,
                status: status,
                totalAmount: service.price,
                services: {
                  create: {
                    serviceId: service.id,
                    staffId: staffMember.id,
                    price: service.price,
                    duration: service.duration
                  }
                }
              }
            });
            
            totalCreated++;
          } catch (error) {
            // Skip if there's a conflict
            if (!error.message.includes('Unique constraint')) {
              console.error('     Error:', error.message);
            }
          }
          
          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      console.log(`\n✅ Successfully created ${totalCreated} bookings`);
      
      // Verify the fix
      const newBookingsByDate = await prisma.booking.groupBy({
        by: ['startTime'],
        _count: true
      });
      
      console.log('\n📊 New distribution summary:');
      const dateCounts = {};
      for (const item of newBookingsByDate) {
        const date = item.startTime.toISOString().split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + item._count;
      }
      
      Object.entries(dateCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, count]) => {
          console.log(`   ${date}: ${count} bookings`);
        });
      
    } else {
      console.log('\n✅ No problematic dates found with excessive bookings.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixProductionBookings()
  .then(() => {
    console.log('\n✨ Booking fix completed!');
  })
  .catch(console.error);