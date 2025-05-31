import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const merchants = await prisma.merchant.findMany();
    const services = await prisma.service.findMany();
    const staff = await prisma.staff.findMany();
    const customers = await prisma.customer.findMany();
    
    console.log('Database Contents:');
    console.log('==================');
    console.log(`Merchants: ${merchants.length}`);
    merchants.forEach(m => console.log(`  - ${m.name} (ID: ${m.id})`));
    
    console.log(`\nServices: ${services.length}`);
    services.forEach(s => console.log(`  - ${s.name} (${s.merchantId})`));
    
    console.log(`\nStaff: ${staff.length}`);
    staff.forEach(s => console.log(`  - ${s.firstName} ${s.lastName} (${s.merchantId})`));
    
    console.log(`\nCustomers: ${customers.length}`);
    customers.forEach(c => console.log(`  - ${c.name} (${c.merchantId})`));
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();