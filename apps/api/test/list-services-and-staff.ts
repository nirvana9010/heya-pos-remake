import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listServicesAndStaff() {
  try {
    // Get all services
    console.log('📋 SERVICES');
    console.log('===========\n');
    
    const services = await prisma.service.findMany({
      orderBy: [
        { categoryModel: { sortOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        categoryModel: true
      }
    });
    
    // Group services by category
    const servicesByCategory = new Map<string, typeof services>();
    
    for (const service of services) {
      const categoryName = service.categoryModel?.name || 'Uncategorized';
      if (!servicesByCategory.has(categoryName)) {
        servicesByCategory.set(categoryName, []);
      }
      servicesByCategory.get(categoryName)!.push(service);
    }
    
    // Display services by category
    for (const [category, categoryServices] of servicesByCategory) {
      console.log(`\n${category.toUpperCase()}`);
      console.log('-'.repeat(category.length));
      
      for (const service of categoryServices) {
        console.log(`\n${service.name}`);
        console.log(`  ID: ${service.id}`);
        console.log(`  Price: $${service.price}`);
        console.log(`  Duration: ${service.duration} minutes`);
        if (service.description) {
          console.log(`  Description: ${service.description}`);
        }
        console.log(`  Active: ${service.isActive ? 'Yes' : 'No'}`);
        if (service.requiresDeposit) {
          console.log(`  Deposit Required: $${service.depositAmount}`);
        }
      }
    }
    
    console.log('\n\n👥 STAFF MEMBERS');
    console.log('================\n');
    
    const staff = await prisma.staff.findMany({
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });
    
    for (const member of staff) {
      console.log(`\n${member.firstName} ${member.lastName}`);
      console.log(`  ID: ${member.id}`);
      console.log(`  Email: ${member.email}`);
      console.log(`  Phone: ${member.phone}`);
      console.log(`  Status: ${member.status}`);
      console.log(`  Has PIN: ${member.pin ? 'Yes' : 'No'}`);
      console.log(`  Can View All Bookings: ${member.canViewAllBookings ? 'Yes' : 'No'}`);
      
      // Get booking count for this staff member
      const bookingCount = await prisma.booking.count({
        where: { providerId: member.id }
      });
      console.log(`  Total Bookings: ${bookingCount}`);
    }
    
    // Summary statistics
    console.log('\n\n📊 SUMMARY');
    console.log('==========');
    console.log(`Total Services: ${services.length}`);
    console.log(`Active Services: ${services.filter(s => s.isActive).length}`);
    console.log(`Total Staff: ${staff.length}`);
    console.log(`Active Staff: ${staff.filter(s => s.status === 'ACTIVE').length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listServicesAndStaff();