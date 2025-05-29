import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSearch() {
  console.log('Testing case-insensitive search...\n');

  // Get merchant
  const merchant = await prisma.merchant.findFirst();
  if (!merchant) {
    console.log('No merchant found!');
    return;
  }
  console.log(`Using merchant: ${merchant.name} (${merchant.id})\n`);

  // Test service search
  console.log('=== Testing Service Search ===');
  
  // Original case
  const services1 = await prisma.service.findMany({
    where: {
      merchantId: merchant.id,
      name: { contains: 'Facial' }
    }
  });
  console.log(`Search for "Facial": ${services1.length} results`);
  
  // Upper case (should fail with current Prisma)
  const services2 = await prisma.service.findMany({
    where: {
      merchantId: merchant.id,
      name: { contains: 'FACIAL' }
    }
  });
  console.log(`Search for "FACIAL": ${services2.length} results`);
  
  // Raw SQL test
  const services3 = await prisma.$queryRaw<any[]>`
    SELECT * FROM Service 
    WHERE merchantId = ${merchant.id} 
    AND LOWER(name) LIKE ${`%facial%`}
  `;
  console.log(`Raw SQL search for "facial": ${services3.length} results`);

  // Test customer search
  console.log('\n=== Testing Customer Search ===');
  
  const customers1 = await prisma.customer.findMany({
    where: {
      merchantId: merchant.id,
      firstName: { contains: 'Jane' }
    }
  });
  console.log(`Search for "Jane": ${customers1.length} results`);
  
  const customers2 = await prisma.customer.findMany({
    where: {
      merchantId: merchant.id,
      firstName: { contains: 'JANE' }
    }
  });
  console.log(`Search for "JANE": ${customers2.length} results`);
  
  const customers3 = await prisma.$queryRaw<any[]>`
    SELECT * FROM Customer 
    WHERE merchantId = ${merchant.id} 
    AND LOWER(firstName) LIKE ${`%jane%`}
  `;
  console.log(`Raw SQL search for "jane": ${customers3.length} results`);

  await prisma.$disconnect();
}

testSearch().catch(console.error);