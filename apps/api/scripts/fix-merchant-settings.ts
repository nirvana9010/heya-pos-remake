import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixMerchantSettings() {
  try {
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        settings: true
      }
    });

    console.log('Found merchants:', merchants.length);
    
    for (const merchant of merchants) {
      console.log('\nProcessing merchant:', merchant.name);
      
      let settings = merchant.settings as any;
      
      // Fix nested settings structure
      while (settings && typeof settings === 'object' && 'settings' in settings && settings.settings) {
        // Merge top-level properties with nested settings
        const topLevelProps = { ...settings };
        delete topLevelProps.settings;
        settings = { ...settings.settings, ...topLevelProps };
      }
      
      // Fix businessHours to include isOpen field
      if (settings.businessHours) {
        const fixedBusinessHours: any = {};
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        dayNames.forEach(day => {
          if (settings.businessHours[day]) {
            fixedBusinessHours[day] = {
              open: settings.businessHours[day].open || '09:00',
              close: settings.businessHours[day].close || '17:00',
              isOpen: true // Add the missing isOpen field
            };
          } else {
            // Add default hours for missing days
            fixedBusinessHours[day] = {
              open: '09:00',
              close: '17:00',
              isOpen: day !== 'sunday' // Closed on Sunday by default
            };
          }
        });
        
        settings.businessHours = fixedBusinessHours;
      } else {
        // Add default business hours if missing
        settings.businessHours = {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '09:00', close: '17:00', isOpen: true },
          sunday: { open: '09:00', close: '17:00', isOpen: false }
        };
      }
      
      // Ensure priceToDurationRatio has a default value
      if (!settings.priceToDurationRatio) {
        settings.priceToDurationRatio = 1.0;
      }
      
      // Update the merchant with fixed settings
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { settings: settings as any }
      });
      
      console.log('Fixed settings for', merchant.name);
    }
    
    console.log('\nAll merchants fixed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMerchantSettings();