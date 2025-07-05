const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.outboxEvent.count({
    where: {
      processedAt: null
    }
  });
  
  console.log('Unprocessed OutboxEvents:', count);
  
  // Get a sample of unprocessed events
  const samples = await prisma.outboxEvent.findMany({
    where: {
      processedAt: null
    },
    take: 5,
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log('\nOldest unprocessed events:');
  samples.forEach(event => {
    console.log(`- ${event.eventType} created at ${event.createdAt}, retryCount: ${event.retryCount}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());