import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addShowOnlyRosteredStaffDefaultSetting() {
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
      if (currentSettings.showOnlyRosteredStaffDefault !== undefined) {
        continue;
      }
      
      // Add the new setting (default: true - show only rostered staff)
      const updatedSettings = {
        ...currentSettings,
        showOnlyRosteredStaffDefault: true,
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
  addShowOnlyRosteredStaffDefaultSetting()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default addShowOnlyRosteredStaffDefaultSetting;