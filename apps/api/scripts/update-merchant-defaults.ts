import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMerchantDefaults() {
  console.log('Updating merchant settings with new defaults...');
  
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany();
    
    console.log(`Found ${merchants.length} merchants to update`);
    
    for (const merchant of merchants) {
      const currentSettings = merchant.settings as any || {};
      
      // Only update if these fields don't exist
      const updatedSettings = {
        ...currentSettings,
        showUnassignedColumn: currentSettings.showUnassignedColumn ?? false,
        allowUnassignedBookings: currentSettings.allowUnassignedBookings ?? false,
        calendarStartHour: currentSettings.calendarStartHour ?? 6,
        calendarEndHour: currentSettings.calendarEndHour ?? 23,
        allowWalkInBookings: currentSettings.allowWalkInBookings ?? true,
      };
      
      // Only update if something changed
      if (JSON.stringify(currentSettings) !== JSON.stringify(updatedSettings)) {
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { settings: updatedSettings },
        });
        console.log(`✅ Updated settings for ${merchant.name}`);
      } else {
        console.log(`⏭️  Skipped ${merchant.name} - already has all settings`);
      }
    }
    
    console.log('\n✅ All merchants updated successfully!');
  } catch (error) {
    console.error('Error updating merchant defaults:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateMerchantDefaults();