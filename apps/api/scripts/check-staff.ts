import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkStaff() {
  try {
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log('Found merchants:', merchants.length);
    
    for (const merchant of merchants) {
      console.log(`\nMerchant: ${merchant.name} (${merchant.id})`);
      
      const staff = await prisma.staff.findMany({
        where: {
          merchantId: merchant.id
        },
        include: {
          schedules: true
        }
      });
      
      console.log(`  Staff members: ${staff.length}`);
      
      staff.forEach(s => {
        console.log(`    - ${s.firstName} ${s.lastName || ''} (${s.status}) - ${s.schedules.length} schedules`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStaff();