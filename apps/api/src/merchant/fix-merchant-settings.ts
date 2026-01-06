import { PrismaClient } from "@prisma/client";

/**
 * Fix merchant settings that have been corrupted by double-stringification
 * or character-indexed storage issues
 */
async function fixMerchantSettings() {
  const prisma = new PrismaClient();

  try {
    console.log("Starting merchant settings fix...");

    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      select: { id: true, name: true, settings: true },
    });

    console.log(`Found ${merchants.length} merchants to check`);

    for (const merchant of merchants) {
      let settings = merchant.settings;
      let needsUpdate = false;

      console.log(`\nChecking merchant: ${merchant.name} (${merchant.id})`);
      console.log("Current settings type:", typeof settings);

      // Case 1: Character-indexed object ({"0": "{", "1": "\"", ...})
      if (settings && typeof settings === "object" && "0" in settings) {
        console.log("Found character-indexed object, converting...");
        const chars = [];
        let i = 0;
        while (i in settings) {
          chars.push(settings[i]);
          i++;
        }
        const jsonString = chars.join("");
        console.log("Reconstructed string:", jsonString);

        try {
          settings = JSON.parse(jsonString);
          needsUpdate = true;
        } catch (e) {
          console.error("Failed to parse reconstructed string:", e);
          continue;
        }
      }

      // Case 2: String that needs to be parsed
      else if (typeof settings === "string") {
        console.log("Found string settings, parsing...");
        try {
          settings = JSON.parse(settings);
          needsUpdate = true;
        } catch (e) {
          console.error("Failed to parse settings string:", e);
          continue;
        }
      }

      // Case 3: Already an object but might have numeric keys mixed with real keys
      else if (settings && typeof settings === "object") {
        const numericKeys = Object.keys(settings).filter(
          (key) => !isNaN(Number(key)),
        );
        if (numericKeys.length > 0) {
          console.log("Found object with numeric keys, cleaning...");
          const cleanSettings = {};
          for (const key in settings) {
            if (isNaN(Number(key))) {
              cleanSettings[key] = settings[key];
            }
          }
          settings = cleanSettings;
          needsUpdate = true;
        }
      }

      // Update if needed
      if (needsUpdate) {
        console.log("Updating merchant settings to:", settings);

        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { settings },
        });

        console.log("Updated successfully");
      } else {
        console.log("Settings are already correct");
      }
    }

    console.log("\nMerchant settings fix completed!");
  } catch (error) {
    console.error("Error fixing merchant settings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixMerchantSettings();
}

export { fixMerchantSettings };
