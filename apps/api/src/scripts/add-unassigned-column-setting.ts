import { PrismaClient } from '@prisma/client';
import { MerchantSettings } from '../types/models/merchant';

const prisma = new PrismaClient();

async function addUnassignedColumnSetting() {

  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      include: {
        _count: {
          select: {
            staff: true,
          },
        },
      },
    });


    for (const merchant of merchants) {
      const currentSettings = merchant.settings as any;
      
      // Check if showUnassignedColumn already exists
      if (currentSettings.showUnassignedColumn !== undefined) {
        continue;
      }

      // Determine if merchant should have unassigned column enabled by default
      // Enable for merchants with 0 or 1 staff members
      const shouldEnableUnassignedColumn = merchant._count.staff <= 1;

      // Update settings
      const updatedSettings: Partial<MerchantSettings> = {
        ...currentSettings,
        showUnassignedColumn: shouldEnableUnassignedColumn,
      };

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          settings: updatedSettings as any,
        },
      });

    }

  } catch (error) {
    throw error;
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addUnassignedColumnSetting();