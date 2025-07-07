import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBusinessHours() {
  console.log('Starting business hours migration...');
  
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      include: {
        locations: true
      }
    });
    
    console.log(`Found ${merchants.length} merchants to process`);
    
    for (const merchant of merchants) {
      console.log(`\nProcessing merchant: ${merchant.name} (${merchant.id})`);
      
      // Get current settings
      const currentSettings = merchant.settings as any || {};
      
      // Skip if already has businessHours
      if (currentSettings.businessHours) {
        console.log('  - Already has businessHours, skipping');
        continue;
      }
      
      // Find business hours from first location
      let businessHours = null;
      if (merchant.locations && merchant.locations.length > 0) {
        const firstLocation = merchant.locations[0];
        if (firstLocation.businessHours) {
          businessHours = firstLocation.businessHours;
          console.log(`  - Found businessHours from location: ${firstLocation.name}`);
        }
      }
      
      // Use default business hours if none found
      if (!businessHours) {
        console.log('  - No location businessHours found, using defaults');
        businessHours = {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '09:00', close: '17:00', isOpen: true },
          sunday: { open: '09:00', close: '17:00', isOpen: false }
        };
      }
      
      // Update merchant settings
      const updatedSettings = {
        ...currentSettings,
        businessHours
      };
      
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { settings: updatedSettings }
      });
      
      console.log('  - Updated merchant settings with businessHours');
    }
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateBusinessHours()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });