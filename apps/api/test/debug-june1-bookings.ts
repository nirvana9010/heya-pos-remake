import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, format } from 'date-fns';

const prisma = new PrismaClient();

async function debugJune1Bookings() {
  console.log('\n=== Debugging June 1st Bookings ===\n');
  
  // Test date
  const testDate = new Date('2025-06-01');
  console.log('Test date:', testDate.toISOString());
  console.log('Test date (local):', testDate.toString());
  
  // Show how startOfDay/endOfDay work
  const startDay = startOfDay(testDate);
  const endDay = endOfDay(testDate);
  
  console.log('\nDate boundaries:');
  console.log('startOfDay:', startDay.toISOString());
  console.log('endOfDay:', endDay.toISOString());
  
  // Query 1: Check how dates are stored
  console.log('\n1. Sample of ALL booking dates:');
  const sampleBookings = await prisma.$queryRaw`
    SELECT id, starttime, status 
    FROM booking 
    ORDER BY starttime DESC
    LIMIT 10
  `;
  console.log(`Sample bookings:`);
  (sampleBookings as any[]).forEach((b: any) => {
    console.log(`  - ${b.id}: ${b.starttime} (${b.status})`);
  });
  
  // Query 1b: Try different date format
  console.log('\n1b. Bookings with datetime format:');
  const rawBookings = await prisma.$queryRaw`
    SELECT id, customerid, datetime(starttime) as starttime_formatted, starttime, status 
    FROM booking 
    WHERE datetime(starttime) >= datetime('2025-06-01 00:00:00')
      AND datetime(starttime) < datetime('2025-06-02 00:00:00')
    ORDER BY starttime
  `;
  console.log(`Found ${(rawBookings as any[]).length} bookings`);
  (rawBookings as any[]).forEach((b: any) => {
    console.log(`  - ${b.id}: ${b.starttime} (${b.status})`);
  });
  
  // Query 2: Using Prisma with date-fns boundaries
  console.log('\n2. Bookings using date-fns boundaries:');
  const prismaBookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: startDay,
        lte: endDay,
      }
    },
    select: {
      id: true,
      startTime: true,
      status: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
        }
      }
    },
    orderBy: { startTime: 'asc' }
  });
  
  console.log(`Found ${prismaBookings.length} bookings`);
  prismaBookings.forEach(b => {
    const name = b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : 'Unknown';
    console.log(`  - ${b.id}: ${b.startTime.toISOString()} - ${name} (${b.status})`);
  });
  
  // Query 3: Check timezone differences
  console.log('\n3. Timezone analysis:');
  const sampleBooking = prismaBookings[0];
  if (sampleBooking) {
    console.log('Sample booking time analysis:');
    console.log('  - ISO String:', sampleBooking.startTime.toISOString());
    console.log('  - Local String:', sampleBooking.startTime.toString());
    console.log('  - UTC Hours:', sampleBooking.startTime.getUTCHours());
    console.log('  - Local Hours:', sampleBooking.startTime.getHours());
  }
  
  // Query 4: Get all bookings for the week
  console.log('\n4. All bookings from May 31 to June 2:');
  const weekBookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: new Date('2025-05-31'),
        lte: new Date('2025-06-02'),
      }
    },
    select: {
      id: true,
      startTime: true,
      status: true,
    },
    orderBy: { startTime: 'asc' }
  });
  
  // Group by date
  const byDate = weekBookings.reduce((acc, b) => {
    const date = format(b.startTime, 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {} as Record<string, any[]>);
  
  Object.entries(byDate).forEach(([date, bookings]) => {
    console.log(`  ${date}: ${bookings.length} bookings`);
  });
  
  await prisma.$disconnect();
}

debugJune1Bookings().catch(console.error);