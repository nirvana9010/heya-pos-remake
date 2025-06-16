import { PrismaClient } from '@prisma/client';

async function getTestData() {
  const prisma = new PrismaClient();
  
  try {
    // Get a customer
    const customers = await prisma.customer.findMany({
      take: 1,
      select: { id: true, firstName: true, lastName: true }
    });
    console.log('Customer:', customers[0]);
    
    // Get a staff member
    const staff = await prisma.staff.findMany({
      take: 1,
      select: { id: true, firstName: true, lastName: true }
    });
    console.log('Staff:', staff[0]);
    
    // Get a service
    const services = await prisma.service.findMany({
      take: 1,
      select: { id: true, name: true, duration: true }
    });
    console.log('Service:', services[0]);
    
    // Get a location
    const locations = await prisma.location.findMany({
      take: 1,
      select: { id: true, name: true }
    });
    console.log('Location:', locations[0]);
    
  } finally {
    await prisma.$disconnect();
  }
}

getTestData().catch(console.error);