import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAllowUnassignedBookingsSetting() {
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
      
      // Skip if already has the setting
      if (currentSettings.allowUnassignedBookings !== undefined) {
        continue;
      }
      
      // Add the new setting (default to true for backward compatibility)
      const updatedSettings = {
        ...currentSettings,
        allowUnassignedBookings: true,
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

// Run the script
addAllowUnassignedBookingsSetting();