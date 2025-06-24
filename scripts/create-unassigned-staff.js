#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUnassignedStaff() {
  console.log('🔧 Creating Unassigned staff members for all merchants...\n');
  
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany();
    
    for (const merchant of merchants) {
      console.log(`📋 Processing merchant: ${merchant.name}`);
      
      // Check if unassigned staff already exists
      const existingUnassigned = await prisma.staff.findFirst({
        where: {
          merchantId: merchant.id,
          OR: [
            { firstName: 'Unassigned' },
            { email: 'unassigned@system.local' },
          ],
        },
      });
      
      if (existingUnassigned) {
        console.log('   ✅ Unassigned staff already exists');
        continue;
      }
      
      // Create unassigned staff with unique email per merchant
      const unassignedStaff = await prisma.staff.create({
        data: {
          merchantId: merchant.id,
          email: `unassigned.${merchant.id}@system.local`,
          firstName: 'Unassigned',
          lastName: '',
          phone: '+61 000 000 000',
          pin: await bcrypt.hash('system', 10),
          accessLevel: 0, // minimal access
          calendarColor: '#9CA3AF', // Gray
          status: 'ACTIVE',
          commissionRate: 0,
        },
      });
      
      console.log(`   ✅ Created Unassigned staff with ID: ${unassignedStaff.id}`);
    }
    
    console.log('\n✅ All merchants now have an Unassigned staff member');
    
  } catch (error) {
    console.error('\n❌ Error creating unassigned staff:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createUnassignedStaff();