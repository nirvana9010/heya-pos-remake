import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMerchantSettings() {
  console.log('Checking merchant settings...');
  
  const merchants = await prisma.merchant.findMany();
  
  for (const merchant of merchants) {
    console.log(`\nChecking merchant: ${merchant.name}`);
    console.log('Current settings type:', typeof merchant.settings);
    console.log('Current settings:', JSON.stringify(merchant.settings).substring(0, 100) + '...');
    
    let settings = merchant.settings as any;
    let needsUpdate = false;
    
    // Check if settings is the weird character-indexed object
    if (settings && typeof settings === 'object' && '0' in settings) {
      console.log('Found character-indexed object, fixing...');
      
      // Convert character-indexed object back to string
      const chars = [];
      let i = 0;
      while (i in settings) {
        chars.push(settings[i]);
        i++;
      }
      const jsonString = chars.join('');
      
      // Parse the JSON string
      settings = JSON.parse(jsonString);
      needsUpdate = true;
    } else if (typeof settings === 'string') {
      console.log('Found string settings, parsing...');
      settings = JSON.parse(settings);
      needsUpdate = true;
    }
    
    // Add missing deposit settings if not present
    if (!('requireDeposit' in settings)) {
      settings.requireDeposit = false;
      settings.depositPercentage = 30;
      needsUpdate = true;
      console.log('Added missing deposit settings');
    }
    
    if (needsUpdate) {
      console.log('Updating merchant settings to:', settings);
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { settings: settings }
      });
      console.log('✅ Fixed settings for:', merchant.name);
    } else {
      console.log('✅ Settings are already correct');
    }
  }
  
  console.log('\nDone!');
}

fixMerchantSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());