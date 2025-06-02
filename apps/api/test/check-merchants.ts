import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMerchants() {
  console.log('Checking merchants in database...\n');
  
  const merchants = await prisma.merchant.findMany();
  
  console.log(`Found ${merchants.length} merchants:\n`);
  
  merchants.forEach(merchant => {
    console.log(`Merchant: ${merchant.name}`);
    console.log(`  ID: ${merchant.id}`);
    console.log(`  Email: ${merchant.email}`);
    console.log(`  Subdomain: ${merchant.subdomain}`);
    console.log('');
  });
  
  // Get all merchant auths
  console.log('\nMerchant Auth Records:');
  const auths = await prisma.merchantAuth.findMany({
    select: {
      username: true,
      merchantId: true,
      lastLoginAt: true
    }
  });
  
  auths.forEach(auth => {
    console.log(`  Username: ${auth.username}, MerchantID: ${auth.merchantId}`);
  });
  
  // Check specific auth
  console.log('Checking auth for sarah@hamiltonbeauty.com:');
  const auth = await prisma.merchantAuth.findUnique({
    where: { username: 'sarah@hamiltonbeauty.com' }
  });
  console.log(auth || 'Not found');
  
  await prisma.$disconnect();
}

checkMerchants().catch(console.error);