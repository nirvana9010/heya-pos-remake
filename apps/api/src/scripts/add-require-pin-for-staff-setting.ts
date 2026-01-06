import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addRequirePinForStaffSetting() {
  console.log("Starting migration to add requirePinForStaff setting...");

  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    console.log(`Found ${merchants.length} merchants to update`);

    let updated = 0;
    let skipped = 0;

    for (const merchant of merchants) {
      const settings = merchant.settings as any;

      // Check if requirePinForStaff already exists
      if (settings.requirePinForStaff !== undefined) {
        console.log(
          `Merchant ${merchant.name} already has requirePinForStaff setting, skipping...`,
        );
        skipped++;
        continue;
      }

      // Add requirePinForStaff setting (default to true for backward compatibility)
      const updatedSettings = {
        ...settings,
        requirePinForStaff: true,
        requirePinForReports: settings.requirePinForReports ?? true, // Also ensure this exists
      };

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          settings: updatedSettings,
        },
      });

      console.log(
        `Updated merchant ${merchant.name} with requirePinForStaff setting`,
      );
      updated++;
    }

    console.log(`\nMigration completed successfully!`);
    console.log(`Updated: ${updated} merchants`);
    console.log(`Skipped: ${skipped} merchants`);
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addRequirePinForStaffSetting()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
