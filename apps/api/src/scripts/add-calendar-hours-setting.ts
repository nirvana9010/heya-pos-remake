import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCalendarHoursSetting() {
  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });
    
    // Update each merchant
    for (const merchant of merchants) {
      const currentSettings = merchant.settings as any;
      
      // Skip if already has the settings
      if (currentSettings.calendarStartHour !== undefined && 
          currentSettings.calendarEndHour !== undefined) {
        continue;
      }
      
      // Add the new settings (defaults: 6 AM - 11 PM)
      const updatedSettings = {
        ...currentSettings,
        calendarStartHour: currentSettings.calendarStartHour ?? 6,
        calendarEndHour: currentSettings.calendarEndHour ?? 23,
      };
      
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { settings: updatedSettings },
      });
    }
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if called directly
if (require.main === module) {
  addCalendarHoursSetting()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default addCalendarHoursSetting;