const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function createTestData() {
  console.log('Creating test data with proper UUIDs...\n');
  
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
    
    // Check location
    let location = await prisma.location.findFirst({
      where: { merchantId: merchant.id }
    });
    
    if (!location) {
      console.log('❌ No location found!');
      return;
    }
    
    console.log(`✓ Found location: ${location.name}`);
    
    // Create service category
    const categoryId = randomUUID();
    const category = await prisma.serviceCategory.create({
      data: {
        id: categoryId,
        merchantId: merchant.id,
        name: 'Test Hair Services',
        sortOrder: 100,
        isActive: true
      }
    });
    console.log('✓ Created service category');
    
    // Create services with padding times
    const serviceIds = {
      haircut: randomUUID(),
      color: randomUUID()
    };
    
    const services = await Promise.all([
      prisma.service.create({
        data: {
          id: serviceIds.haircut,
          merchantId: merchant.id,
          categoryId: category.id,
          name: 'Test Haircut',
          description: 'Test haircut service',
          duration: 30,
          paddingBefore: 5,
          paddingAfter: 10,
          price: 50,
          isActive: true
        }
      }),
      prisma.service.create({
        data: {
          id: serviceIds.color,
          merchantId: merchant.id,
          categoryId: category.id,
          name: 'Test Hair Color',
          description: 'Test hair coloring',
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
    const staffIds = {
      jane: randomUUID(),
      john: randomUUID()
    };
    
    const staff = await Promise.all([
      prisma.staff.create({
        data: {
          id: staffIds.jane,
          merchantId: merchant.id,
          email: `jane.test.${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'Jane',
          phone: '+61412345678',
          pin: '1234',
          status: 'ACTIVE'
        }
      }),
      prisma.staff.create({
        data: {
          id: staffIds.john,
          merchantId: merchant.id,
          email: `john.test.${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'John',
          phone: '+61498765432',
          pin: '5678',
          status: 'ACTIVE'
        }
      })
    ]);
    console.log(`✓ Created ${staff.length} staff members`);
    
    // Assign staff to location
    await Promise.all([
      prisma.staffLocation.create({
        data: {
          staffId: staff[0].id,
          locationId: location.id
        }
      }),
      prisma.staffLocation.create({
        data: {
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
    
    // Test availability immediately
    console.log('\n🧪 Testing availability with created data...\n');
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    
    const url = `http://localhost:3000/api/public/availability?staffId=${staff[0].id}&serviceId=${services[0].id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    
    const fetch = require('node-fetch');
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Availability check: ${response.status}`);
    if (response.ok) {
      console.log(`Available slots: ${data.availableSlots?.length || 0}`);
    } else {
      console.log('Error:', data);
    }
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();