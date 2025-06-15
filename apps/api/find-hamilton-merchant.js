const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findHamiltonMerchant() {
  console.log('Finding HAMILTON merchant details...\n');
  
  const merchantAuth = await prisma.merchantAuth.findUnique({
    where: { username: 'HAMILTON' },
    include: { merchant: true }
  });
  
  if (merchantAuth) {
    console.log('Found merchant auth:');
    console.log(`  Username: ${merchantAuth.username}`);
    console.log(`  Merchant ID: ${merchantAuth.merchantId}`);
    console.log(`  Merchant Name: ${merchantAuth.merchant.name}`);
    console.log(`  Status: ${merchantAuth.merchant.status}`);
  } else {
    console.log('HAMILTON merchant auth not found!');
  }
  
  await prisma.$disconnect();
}

findHamiltonMerchant().catch(console.error);