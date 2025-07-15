import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkZenEmail() {
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: 'zen-wellness' }
  });
  
  console.log('Zen Wellness email:', merchant?.email);
  console.log('\nYou can login with:');
  console.log('Email:', merchant?.email);
  console.log('Password: demo456');
}

checkZenEmail()
  .catch(console.error)
  .finally(() => prisma.$disconnect());