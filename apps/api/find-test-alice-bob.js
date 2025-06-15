const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTestStaff() {
  const HAMILTON_MERCHANT_ID = '408647b5-3ca9-4955-8a22-8c536d3d6a1b';
  
  const staff = await prisma.staff.findMany({
    where: {
      merchantId: HAMILTON_MERCHANT_ID,
      firstName: 'Test'
    }
  });
  
  console.log('Found Test staff for HAMILTON:');
  staff.forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName}: ${s.id}`);
  });
  
  await prisma.$disconnect();
}

findTestStaff().catch(console.error);