import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCheckInLite() {
  console.log('Testing Check-In Lite package functionality...\n');

  try {
    // Find the Check-In Lite package
    const checkInLitePackage = await prisma.package.findFirst({
      where: { name: 'Check-In Lite' },
    });

    if (!checkInLitePackage) {
      console.error('❌ Check-In Lite package not found. Run add-check-in-lite-package.ts first.');
      return;
    }

    console.log('✅ Found Check-In Lite package:', checkInLitePackage.id);

    // Find Hamilton Beauty Spa merchant
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Hamilton Beauty Spa' },
      include: { package: true },
    });

    if (!merchant) {
      console.error('❌ Hamilton Beauty Spa merchant not found');
      return;
    }

    console.log('\nCurrent merchant details:');
    console.log('- Name:', merchant.name);
    console.log('- Current Package:', merchant.package?.name);
    console.log('- Package Features:', merchant.package?.features);

    // Update merchant to use Check-In Lite package
    console.log('\n🔄 Updating merchant to Check-In Lite package...');
    
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchant.id },
      data: { packageId: checkInLitePackage.id },
      include: { package: true },
    });

    console.log('\n✅ Merchant updated successfully!');
    console.log('- New Package:', updatedMerchant.package?.name);
    console.log('- Features:', JSON.stringify(updatedMerchant.package?.features, null, 2));

    // Test the features service
    console.log('\n🧪 Testing feature checks...');
    
    const merchantWithPackage = await prisma.merchant.findUnique({
      where: { id: merchant.id },
      include: { package: true },
    });

    const features = (merchantWithPackage?.package?.features as any)?.enabled || [];
    
    console.log('\nEnabled features:', features);
    console.log('\nFeature checks:');
    console.log('- Has check_in_only:', features.includes('check_in_only'));
    console.log('- Has customers:', features.includes('customers'));
    console.log('- Has loyalty:', features.includes('loyalty'));
    console.log('- Has services:', features.includes('services'));
    console.log('- Has staff:', features.includes('staff'));
    console.log('- Has bookings:', features.includes('bookings'));

    console.log('\n✅ Test complete! Hamilton Beauty Spa is now on Check-In Lite package.');
    console.log('\nTo test the full flow:');
    console.log('1. Start the merchant app: cd apps/merchant-app && npm run dev');
    console.log('2. Login as Hamilton Beauty Spa (admin@hamiltonbeauty.com / demo123)');
    console.log('3. You should see limited navigation with only Check-In, Customers, and Settings');
    console.log('4. Visit the Check-In page to get the customer check-in URL');
    console.log('5. Test the check-in flow in the booking app');

  } catch (error) {
    console.error('❌ Error testing Check-In Lite:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCheckInLite();