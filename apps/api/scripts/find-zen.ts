import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findZen() {
  const merchants = await prisma.merchant.findMany({
    where: { 
      name: { contains: 'Zen', mode: 'insensitive' }
    },
    select: { id: true, name: true, subdomain: true }
  });
  console.log('Merchants with Zen in name:', merchants);
}

findZen()
  .catch(console.error)
  .finally(() => prisma.$disconnect());