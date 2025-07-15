import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking merchants without locations...');

  // Find all merchants
  const merchants = await prisma.merchant.findMany({
    include: {
      locations: true,
    },
  });

  console.log(`Found ${merchants.length} total merchants`);

  // Check which merchants don't have locations
  const merchantsWithoutLocations = merchants.filter(m => m.locations.length === 0);
  console.log(`Found ${merchantsWithoutLocations.length} merchants without locations`);

  if (merchantsWithoutLocations.length > 0) {
    console.log('\nMerchants without locations:');
    for (const merchant of merchantsWithoutLocations) {
      console.log(`- ${merchant.name} (${merchant.id})`);
      
      // Create a default location for this merchant
      const location = await prisma.location.create({
        data: {
          merchantId: merchant.id,
          name: `${merchant.name} Main Location`,
          address: merchant.address || '',
          phone: merchant.phone || '',
          timezone: 'Australia/Sydney', // Default timezone
          isActive: true,
        },
      });
      
      console.log(`  Created location: ${location.name} (${location.id})`);
    }
  }

  // Verify all merchants now have locations
  const merchantsAfter = await prisma.merchant.findMany({
    include: {
      locations: true,
    },
  });

  const stillWithoutLocations = merchantsAfter.filter(m => m.locations.length === 0);
  console.log(`\nAfter fix: ${stillWithoutLocations.length} merchants without locations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });