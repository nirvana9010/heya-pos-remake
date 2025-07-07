import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createTestStaff() {
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log('Creating test staff for all merchants...\n');
    
    const testStaffNames = [
      { firstName: 'Alice', lastName: 'Smith', phone: '+61 400 111 111' },
      { firstName: 'Bob', lastName: 'Jones', phone: '+61 400 222 222' },
      { firstName: 'Carol', lastName: 'Davis', phone: '+61 400 333 333' }
    ];
    
    for (const merchant of merchants) {
      console.log(`Creating staff for ${merchant.name}...`);
      
      // Check if merchant already has staff
      const existingStaff = await prisma.staff.count({
        where: { merchantId: merchant.id }
      });
      
      if (existingStaff > 0) {
        console.log(`  Skipping - already has ${existingStaff} staff members`);
        continue;
      }
      
      // Create test staff
      for (let i = 0; i < testStaffNames.length; i++) {
        const staffData = testStaffNames[i];
        const uniqueSuffix = Date.now() + i;
        const staff = await prisma.staff.create({
          data: {
            merchantId: merchant.id,
            ...staffData,
            email: `${staffData.firstName.toLowerCase()}.${uniqueSuffix}@test.com`,
            status: 'ACTIVE',
            accessLevel: 1,
            calendarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
          }
        });
        console.log(`  Created: ${staff.firstName} ${staff.lastName}`);
      }
    }
    
    console.log('\nTest staff created successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestStaff();