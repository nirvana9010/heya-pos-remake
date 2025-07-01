const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.zkbdyagbdidmhtixqhtc:Lakshaybhutani2004@@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function run() {
  const bookings = await prisma.booking.findMany({
    where: { status: 'NEW' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('\\nNEW bookings:', bookings.length);
  
  for (const b of bookings) {
    const events = await prisma.outboxEvent.findMany({
      where: { aggregateId: b.id }
    });
    console.log(`\\n${b.bookingNumber}: ${events.length} OutboxEvents`);
  }
  
  await prisma.$disconnect();
}

run();
