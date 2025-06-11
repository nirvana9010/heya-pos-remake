const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    // Get total count
    const total = await prisma.booking.count();
    console.log(`\n📊 Total bookings: ${total}`);

    // Get bookings by status
    const statuses = await prisma.booking.groupBy({
      by: ['status'],
      _count: true,
      orderBy: { _count: { status: 'desc' } }
    });
    
    console.log('\n📈 Bookings by status:');
    statuses.forEach(s => {
      console.log(`   ${s.status}: ${s._count}`);
    });

    // Get bookings by date
    const bookings = await prisma.booking.findMany({
      select: {
        startTime: true,
        status: true,
        provider: { select: { firstName: true, lastName: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    // Group by date
    const bookingsByDate = {};
    bookings.forEach(b => {
      const date = b.startTime.toISOString().split('T')[0];
      if (!bookingsByDate[date]) {
        bookingsByDate[date] = { total: 0, statuses: {} };
      }
      bookingsByDate[date].total++;
      bookingsByDate[date].statuses[b.status] = (bookingsByDate[date].statuses[b.status] || 0) + 1;
    });

    console.log('\n📅 Bookings by date:');
    Object.entries(bookingsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        const dayDate = new Date(date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
        const statusSummary = Object.entries(data.statuses)
          .map(([status, count]) => `${status}: ${count}`)
          .join(', ');
        console.log(`   ${date} (${dayName}): ${data.total} bookings [${statusSummary}]`);
      });

    // Get staff workload
    const staffBookings = await prisma.booking.groupBy({
      by: ['providerId'],
      _count: true
    });

    const staffDetails = await prisma.staff.findMany({
      where: {
        id: { in: staffBookings.map(s => s.providerId) }
      }
    });

    const staffMap = {};
    staffDetails.forEach(s => {
      staffMap[s.id] = `${s.firstName} ${s.lastName}`;
    });

    console.log('\n👥 Bookings by staff:');
    staffBookings.forEach(s => {
      console.log(`   ${staffMap[s.providerId] || 'Unknown'}: ${s._count} bookings`);
    });

  } catch (error) {
    console.error('Error checking bookings:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();