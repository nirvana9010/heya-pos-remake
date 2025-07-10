import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding notification settings to all merchants...');

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

    // Update each merchant with default notification settings
    for (const merchant of merchants) {
      const currentSettings = merchant.settings as any || {};
      
      // Add notification settings with defaults (all enabled)
      const updatedSettings = {
        ...currentSettings,
        // Default all notification settings to true if not already set
        bookingConfirmationEmail: currentSettings.bookingConfirmationEmail ?? true,
        bookingConfirmationSms: currentSettings.bookingConfirmationSms ?? true,
        appointmentReminder24hEmail: currentSettings.appointmentReminder24hEmail ?? true,
        appointmentReminder24hSms: currentSettings.appointmentReminder24hSms ?? true,
        appointmentReminder2hEmail: currentSettings.appointmentReminder2hEmail ?? true,
        appointmentReminder2hSms: currentSettings.appointmentReminder2hSms ?? true,
        newBookingNotification: currentSettings.newBookingNotification ?? true,
        cancellationNotification: currentSettings.cancellationNotification ?? true,
      };

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          settings: updatedSettings,
        },
      });

      console.log(`✓ Updated ${merchant.name} with notification settings`);
    }

    console.log('✅ All merchants updated with notification settings');
  } catch (error) {
    console.error('Error adding notification settings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});