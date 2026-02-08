#!/usr/bin/env ts-node

/**
 * Script to update merchant settings with timezone information
 * This ensures all merchants have proper timezone configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌍 Updating merchant timezone settings...');

  try {
    // Get all merchants
    const merchants = await prisma.merchant.findMany({
      include: {
        locations: true,
      },
    });

    console.log(`Found ${merchants.length} merchants to update`);

    for (const merchant of merchants) {
      // Get current settings
      const currentSettings = merchant.settings as any || {};

      // Check if timezone is already set
      if (currentSettings.timezone) {
        console.log(`✓ Merchant ${merchant.name} already has timezone: ${currentSettings.timezone}`);
        continue;
      }

      // Determine timezone from first location or default to Sydney
      let timezone = 'Australia/Sydney';
      if (merchant.locations.length > 0 && merchant.locations[0].timezone) {
        timezone = merchant.locations[0].timezone;
        console.log(`  Using timezone from location: ${timezone}`);
      }

      // Update merchant settings
      const updatedSettings = {
        ...currentSettings,
        timezone,
        // Ensure other important settings have defaults
        currency: currentSettings.currency || 'AUD',
        dateFormat: currentSettings.dateFormat || 'DD/MM/YYYY',
        timeFormat: currentSettings.timeFormat || '12h',
        bookingAdvanceHours: currentSettings.bookingAdvanceHours || 48,
        cancellationHours: currentSettings.cancellationHours ?? 24,
        requirePinForRefunds: currentSettings.requirePinForRefunds ?? true,
        requirePinForCancellations: currentSettings.requirePinForCancellations ?? true,
        loyaltyType: currentSettings.loyaltyType || 'visit',
        loyaltyRate: currentSettings.loyaltyRate || 1,
        requireDeposit: currentSettings.requireDeposit ?? false,
        depositPercentage: currentSettings.depositPercentage || 30,
      };

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          settings: updatedSettings,
        },
      });

      console.log(`✓ Updated merchant ${merchant.name} with timezone: ${timezone}`);
    }

    console.log('\n✅ All merchants updated successfully!');

    // Display summary
    const updatedMerchants = await prisma.merchant.findMany({
      select: {
        name: true,
        settings: true,
      },
    });

    console.log('\n📊 Summary:');
    updatedMerchants.forEach((merchant) => {
      const settings = merchant.settings as any;
      console.log(`  ${merchant.name}: ${settings.timezone || 'No timezone set'}`);
    });

  } catch (error) {
    console.error('❌ Error updating merchants:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
