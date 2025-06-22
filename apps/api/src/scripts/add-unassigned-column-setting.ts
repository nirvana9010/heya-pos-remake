import { PrismaClient } from '@prisma/client';
import { MerchantSettings } from '../types/models/merchant';

const prisma = new PrismaClient();

async function addUnassignedColumnSetting() {
  console.log('Starting migration: Adding showUnassignedColumn setting to merchants...');

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

    console.log(`Found ${merchants.length} merchants to update`);

    for (const merchant of merchants) {
      const currentSettings = merchant.settings as any;
      
      // Check if showUnassignedColumn already exists
      if (currentSettings.showUnassignedColumn !== undefined) {
        console.log(`✓ Merchant ${merchant.name} already has showUnassignedColumn setting`);
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
          settings: updatedSettings,
        },
      });

      console.log(
        `✓ Updated ${merchant.name}: showUnassignedColumn = ${shouldEnableUnassignedColumn} (${merchant._count.staff} staff)`
      );
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addUnassignedColumnSetting();