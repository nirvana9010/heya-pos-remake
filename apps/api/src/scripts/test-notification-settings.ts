import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing notification settings...\n');

  try {
    // Get a merchant to test
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'Test Beauty Salon' },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!merchant) {
      console.log('No test merchant found');
      return;
    }

    console.log(`Merchant: ${merchant.name}`);
    console.log('Current notification settings:');
    
    const settings = merchant.settings as any;
    console.log(`  - Booking Confirmation Email: ${settings.bookingConfirmationEmail ?? 'not set (defaults to true)'}`);
    console.log(`  - Booking Confirmation SMS: ${settings.bookingConfirmationSms ?? 'not set (defaults to true)'}`);
    console.log(`  - 24h Reminder Email: ${settings.appointmentReminder24hEmail ?? 'not set (defaults to true)'}`);
    console.log(`  - 24h Reminder SMS: ${settings.appointmentReminder24hSms ?? 'not set (defaults to true)'}`);
    console.log(`  - 2h Reminder Email: ${settings.appointmentReminder2hEmail ?? 'not set (defaults to true)'}`);
    console.log(`  - 2h Reminder SMS: ${settings.appointmentReminder2hSms ?? 'not set (defaults to true)'}`);
    console.log(`  - New Booking Notification: ${settings.newBookingNotification ?? 'not set (defaults to true)'}`);
    console.log(`  - Cancellation Notification: ${settings.cancellationNotification ?? 'not set (defaults to true)'}`);

    // Test updating a setting
    console.log('\nDisabling SMS notifications for booking confirmations...');
    
    const updatedSettings = {
      ...settings,
      bookingConfirmationSms: false,
      appointmentReminder24hSms: false,
    };

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        settings: updatedSettings,
      },
    });

    console.log('✅ Settings updated successfully');

    // Verify the update
    const updatedMerchant = await prisma.merchant.findUnique({
      where: { id: merchant.id },
      select: { settings: true },
    });

    const newSettings = updatedMerchant?.settings as any;
    console.log('\nUpdated settings:');
    console.log(`  - Booking Confirmation SMS: ${newSettings.bookingConfirmationSms}`);
    console.log(`  - 24h Reminder SMS: ${newSettings.appointmentReminder24hSms}`);

  } catch (error) {
    console.error('Error testing notification settings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});