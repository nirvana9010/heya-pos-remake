import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBookingStats() {
  console.log('📊 Checking booking statistics...\n');
  
  try {
    // Get merchant
    const merchant = await prisma.merchant.findFirst({
      where: { subdomain: 'hamilton' }
    });
    
    if (!merchant) {
      console.error('❌ Hamilton merchant not found');
      return;
    }

    // Get counts
    const totalBookings = await prisma.booking.count({
      where: { merchantId: merchant.id }
    });

    const totalCustomers = await prisma.customer.count({
      where: { merchantId: merchant.id }
    });

    const totalStaff = await prisma.staff.count({
      where: { merchantId: merchant.id }
    });

    const totalServices = await prisma.service.count({
      where: { merchantId: merchant.id }
    });

    // Get bookings by status
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      where: { merchantId: merchant.id },
      _count: true
    });

    // Get today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await prisma.booking.count({
      where: {
        merchantId: merchant.id,
        startTime: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get this week's bookings
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const thisWeekBookings = await prisma.booking.count({
      where: {
        merchantId: merchant.id,
        startTime: {
          gte: startOfWeek,
          lt: endOfWeek
        }
      }
    });

    // Get bookings by date
    const bookingsByDate = await prisma.$queryRaw`
      SELECT 
        DATE(startTime) as date,
        COUNT(*) as count
      FROM Booking
      WHERE merchantId = ${merchant.id}
        AND startTime >= datetime('now', '-7 days')
        AND startTime <= datetime('now', '+7 days')
      GROUP BY DATE(startTime)
      ORDER BY date
    ` as any[];

    // Print results
    console.log('🏢 Hamilton Beauty Spa Statistics');
    console.log('=====================================\n');
    
    console.log('📈 Overall Counts:');
    console.log(`   Total Bookings: ${totalBookings}`);
    console.log(`   Total Customers: ${totalCustomers}`);
    console.log(`   Total Staff: ${totalStaff}`);
    console.log(`   Total Services: ${totalServices}`);
    console.log('');

    console.log('📊 Bookings by Status:');
    bookingsByStatus.forEach(item => {
      console.log(`   ${item.status}: ${item._count}`);
    });
    console.log('');

    console.log('📅 Time-based Statistics:');
    console.log(`   Today's Bookings: ${todayBookings}`);
    console.log(`   This Week's Bookings: ${thisWeekBookings}`);
    console.log('');

    console.log('📆 Daily Booking Count (Last 7 days to Next 7 days):');
    bookingsByDate.forEach((row: any) => {
      const date = new Date(row.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      const isToday = date.toDateString() === today.toDateString();
      const bar = '█'.repeat(Math.min(50, Math.floor(Number(row.count) / 2)));
      const marker = isToday ? ' ← TODAY' : '';
      console.log(`   ${row.date} (${dayName}): ${bar} ${row.count}${marker}`);
    });

    // Get busiest hour
    const busiestHour = await prisma.$queryRaw`
      SELECT 
        strftime('%H', startTime) as hour,
        COUNT(*) as count
      FROM Booking
      WHERE merchantId = ${merchant.id}
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    ` as any[];

    if (busiestHour.length > 0) {
      console.log(`\n⏰ Busiest Hour: ${busiestHour[0].hour}:00 (${busiestHour[0].count} bookings)`);
    }

    // Get most popular service
    const popularService = await prisma.$queryRaw`
      SELECT 
        s.name,
        COUNT(*) as count
      FROM BookingService bs
      JOIN Service s ON bs.serviceId = s.id
      JOIN Booking b ON bs.bookingId = b.id
      WHERE b.merchantId = ${merchant.id}
      GROUP BY s.id, s.name
      ORDER BY count DESC
      LIMIT 1
    ` as any[];

    if (popularService.length > 0) {
      console.log(`🌟 Most Popular Service: ${popularService[0].name} (${popularService[0].count} bookings)`);
    }

  } catch (error) {
    console.error('Error checking stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkBookingStats().catch(console.error);