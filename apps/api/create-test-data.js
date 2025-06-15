const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  console.log('Creating test data...\n');
  
  try {
    // Check if we have a merchant
    const merchant = await prisma.merchant.findFirst({
      where: { status: 'ACTIVE' }
    });
    
    if (!merchant) {
      console.log('❌ No active merchant found!');
      return;
    }
    
    console.log(`✓ Found merchant: ${merchant.name}`);
    
    // Create a location if needed
    let location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });
    
    if (!location) {
      location = await prisma.location.create({
        data: {
          merchantId: merchant.id,
          name: 'Main Location',
          address: '123 Test St',
          city: 'Sydney',
          state: 'NSW',
          postcode: '2000',
          country: 'Australia',
          timezone: 'Australia/Sydney',
          isActive: true
        }
      });
      console.log('✓ Created location');
    } else {
      console.log(`✓ Found location: ${location.name}`);
    }
    
    // Create service categories
    const category = await prisma.serviceCategory.upsert({
      where: { id: 'test-category' },
      update: {},
      create: {
        id: 'test-category',
        merchantId: merchant.id,
        name: 'Hair Services',
        sortOrder: 1,
        isActive: true
      }
    });
    console.log('✓ Created service category');
    
    // Create services with padding times
    const services = await Promise.all([
      prisma.service.upsert({
        where: { id: 'test-haircut' },
        update: { paddingBefore: 5, paddingAfter: 10 },
        create: {
          id: 'test-haircut',
          merchantId: merchant.id,
          categoryId: category.id,
          name: 'Haircut',
          description: 'Professional haircut',
          duration: 30,
          paddingBefore: 5,
          paddingAfter: 10,
          price: 50,
          isActive: true
        }
      }),
      prisma.service.upsert({
        where: { id: 'test-color' },
        update: { paddingBefore: 15, paddingAfter: 15 },
        create: {
          id: 'test-color',
          merchantId: merchant.id,
          categoryId: category.id,
          name: 'Hair Color',
          description: 'Full hair coloring',
          duration: 120,
          paddingBefore: 15,
          paddingAfter: 15,
          price: 150,
          isActive: true
        }
      })
    ]);
    console.log(`✓ Created ${services.length} services`);
    
    // Create staff members
    const staff = await Promise.all([
      prisma.staff.upsert({
        where: { id: 'test-staff-1' },
        update: {},
        create: {
          id: 'test-staff-1',
          merchantId: merchant.id,
          email: 'jane.smith@test.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+61412345678',
          pin: '1234',
          status: 'ACTIVE'
        }
      }),
      prisma.staff.upsert({
        where: { id: 'test-staff-2' },
        update: {},
        create: {
          id: 'test-staff-2',
          merchantId: merchant.id,
          email: 'john.doe@test.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+61498765432',
          pin: '5678',
          status: 'ACTIVE'
        }
      })
    ]);
    console.log(`✓ Created ${staff.length} staff members`);
    
    // Assign staff to location
    await Promise.all([
      prisma.staffLocation.upsert({
        where: {
          staffId_locationId: {
            staffId: staff[0].id,
            locationId: location.id
          }
        },
        update: {},
        create: {
          staffId: staff[0].id,
          locationId: location.id
        }
      }),
      prisma.staffLocation.upsert({
        where: {
          staffId_locationId: {
            staffId: staff[1].id,
            locationId: location.id
          }
        },
        update: {},
        create: {
          staffId: staff[1].id,
          locationId: location.id
        }
      })
    ]);
    console.log('✓ Assigned staff to location');
    
    console.log('\n✅ Test data created successfully!');
    console.log('\nTest Staff IDs:');
    console.log(`  - ${staff[0].firstName} ${staff[0].lastName}: ${staff[0].id}`);
    console.log(`  - ${staff[1].firstName} ${staff[1].lastName}: ${staff[1].id}`);
    console.log('\nTest Service IDs:');
    console.log(`  - ${services[0].name}: ${services[0].id}`);
    console.log(`  - ${services[1].name}: ${services[1].id}`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();