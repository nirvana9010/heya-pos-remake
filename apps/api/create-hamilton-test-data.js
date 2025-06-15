const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function createHamiltonTestData() {
  console.log('Creating test data for HAMILTON merchant...\n');
  
  const HAMILTON_MERCHANT_ID = '408647b5-3ca9-4955-8a22-8c536d3d6a1b';
  
  try {
    // Get merchant and location
    const merchant = await prisma.merchant.findUnique({
      where: { id: HAMILTON_MERCHANT_ID }
    });
    
    if (!merchant) {
      console.log('❌ HAMILTON merchant not found!');
      return;
    }
    
    const location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });
    
    if (!location) {
      console.log('❌ No location found for HAMILTON merchant!');
      return;
    }
    
    console.log(`✓ Found merchant: ${merchant.name}`);
    console.log(`✓ Found location: ${location.name}`);
    
    // Create or find test category
    let category = await prisma.serviceCategory.findFirst({
      where: { 
        merchantId: merchant.id,
        name: 'Test Services'
      }
    });
    
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          id: randomUUID(),
          merchantId: merchant.id,
          name: 'Test Services',
          sortOrder: 999,
          isActive: true
        }
      });
      console.log('✓ Created test category');
    } else {
      console.log('✓ Found existing test category');
    }
    
    // Create test services
    const serviceIds = {
      quickCut: randomUUID(),
      fullService: randomUUID()
    };
    
    const services = await Promise.all([
      prisma.service.upsert({
        where: { id: serviceIds.quickCut },
        update: {},
        create: {
          id: serviceIds.quickCut,
          merchantId: merchant.id,
          categoryId: category.id,
          name: 'Test Quick Cut',
          description: 'Quick test service',
          duration: 30,
          paddingBefore: 5,
          paddingAfter: 10,
          price: 35,
          isActive: true
        }
      }),
      prisma.service.upsert({
        where: { id: serviceIds.fullService },
        update: {},
        create: {
          id: serviceIds.fullService,
          merchantId: merchant.id,
          categoryId: category.id,
          name: 'Test Full Service',
          description: 'Full test service with padding',
          duration: 60,
          paddingBefore: 10,
          paddingAfter: 15,
          price: 85,
          isActive: true
        }
      })
    ]);
    console.log(`✓ Created ${services.length} test services`);
    
    // Create test staff
    const staffIds = {
      alice: randomUUID(),
      bob: randomUUID()
    };
    
    const testTimestamp = Date.now();
    
    const staff = await Promise.all([
      prisma.staff.upsert({
        where: { id: staffIds.alice },
        update: {},
        create: {
          id: staffIds.alice,
          merchantId: merchant.id,
          email: `alice.test.${testTimestamp}@hamilton.com`,
          firstName: 'Test',
          lastName: 'Alice',
          phone: '+61400111222',
          pin: '1111',
          status: 'ACTIVE'
        }
      }),
      prisma.staff.upsert({
        where: { id: staffIds.bob },
        update: {},
        create: {
          id: staffIds.bob,
          merchantId: merchant.id,
          email: `bob.test.${testTimestamp}@hamilton.com`,
          firstName: 'Test',
          lastName: 'Bob',
          phone: '+61400333444',
          pin: '2222',
          status: 'ACTIVE'
        }
      })
    ]);
    console.log(`✓ Created ${staff.length} test staff members`);
    
    // Assign staff to location
    for (const member of staff) {
      await prisma.staffLocation.upsert({
        where: {
          staffId_locationId: {
            staffId: member.id,
            locationId: location.id
          }
        },
        update: {},
        create: {
          staffId: member.id,
          locationId: location.id
        }
      });
    }
    console.log('✓ Assigned staff to location');
    
    console.log('\n✅ Test data created successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log('\nStaff:');
    staff.forEach(s => {
      console.log(`  - ${s.firstName} ${s.lastName}: ${s.id}`);
    });
    console.log('\nServices:');
    services.forEach(s => {
      console.log(`  - ${s.name}: ${s.id} (${s.duration}min + ${s.paddingBefore}/${s.paddingAfter} padding)`);
    });
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createHamiltonTestData();