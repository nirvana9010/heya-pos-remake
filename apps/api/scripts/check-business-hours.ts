import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkBusinessHours() {
  try {
    const merchants = await prisma.merchant.findMany({
      where: {
        name: {
          contains: 'Hamilton'
        }
      },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });

    console.log('Found merchants:', merchants.length);
    
    merchants.forEach(merchant => {
      console.log('\nMerchant:', merchant.name);
      console.log('ID:', merchant.id);
      console.log('Settings:', JSON.stringify(merchant.settings, null, 2));
      
      const settings = merchant.settings as any;
      console.log('Has businessHours?', settings?.businessHours ? 'Yes' : 'No');
      if (settings?.businessHours) {
        console.log('Business Hours:', JSON.stringify(settings.businessHours, null, 2));
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessHours();