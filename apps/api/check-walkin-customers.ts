import { PrismaClient } from '@prisma/client';

async function checkWalkInCustomers() {
  const prisma = new PrismaClient();
  
  try {
    const walkInCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { startsWith: 'Walk-in' } },
          { source: 'WALK_IN' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('Walk-in customers found:', walkInCustomers.length);
    walkInCustomers.forEach((customer, index) => {
      console.log(`\n${index + 1}. Customer ID: ${customer.id}`);
      console.log(`   Name: "${customer.firstName}" "${customer.lastName || '(no last name)'}"`);
      console.log(`   Source: ${customer.source || 'not set'}`);
      console.log(`   Created: ${customer.createdAt.toISOString()}`);
    });
  } catch (error) {
    console.error('Error checking walk-in customers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWalkInCustomers();