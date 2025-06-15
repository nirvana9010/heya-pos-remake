const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestData() {
  console.log('Checking test data in database...\n');
  
  // Find test staff
  const testStaff = await prisma.staff.findMany({
    where: {
      OR: [
        { email: 'jane.smith@test.com' },
        { email: 'john.doe@test.com' }
      ]
    }
  });
  
  console.log('Test Staff:');
  testStaff.forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName}: ${s.id}`);
  });
  
  // Find test services
  const testServices = await prisma.service.findMany({
    where: {
      OR: [
        { name: 'Haircut' },
        { name: 'Hair Color' }
      ]
    }
  });
  
  console.log('\nTest Services:');
  testServices.forEach(s => {
    console.log(`  ${s.name}: ${s.id}`);
  });
  
  await prisma.$disconnect();
}

checkTestData().catch(console.error);