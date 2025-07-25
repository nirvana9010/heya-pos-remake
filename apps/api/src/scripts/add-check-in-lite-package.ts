import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Check-In Lite package...');

  try {
    // Check if package already exists
    const existingPackage = await prisma.package.findFirst({
      where: { name: 'Check-In Lite' },
    });

    if (existingPackage) {
      console.log('Check-In Lite package already exists:', existingPackage.id);
      return;
    }

    // Create the Check-In Lite package
    const checkInLitePackage = await prisma.package.create({
      data: {
        name: 'Check-In Lite',
        monthlyPrice: 19,
        trialDays: 30,
        maxLocations: 1,
        maxStaff: 0,
        maxCustomers: 5000,
        features: {
          enabled: ['customers', 'loyalty', 'check_in_only', 'reports'],
          config: {
            check_in_only: {
              auto_complete_checkins: true,
              show_loyalty_on_checkin: true,
            },
            reports: {
              sections: ['customers', 'loyalty', 'checkins'],
            },
          },
        },
      },
    });

    console.log('✅ Check-In Lite package created:', checkInLitePackage.id);

    // Update existing packages to use new feature format
    console.log('\nUpdating existing packages to new feature format...');

    // Update Starter package
    const starterPackage = await prisma.package.findFirst({
      where: { name: 'Starter' },
    });

    if (starterPackage) {
      await prisma.package.update({
        where: { id: starterPackage.id },
        data: {
          features: {
            enabled: ['customers', 'services', 'bookings', 'payments', 'reports'],
            config: {},
          },
        },
      });
      console.log('✅ Updated Starter package');
    }

    // Update Professional package
    const professionalPackage = await prisma.package.findFirst({
      where: { name: 'Professional' },
    });

    if (professionalPackage) {
      await prisma.package.update({
        where: { id: professionalPackage.id },
        data: {
          features: {
            enabled: [
              'customers',
              'staff',
              'services',
              'bookings',
              'payments',
              'roster',
              'loyalty',
              'reports',
              'notifications',
            ],
            config: {},
          },
        },
      });
      console.log('✅ Updated Professional package');
    }

    console.log('\n✅ All packages updated successfully');
  } catch (error) {
    console.error('Error adding Check-In Lite package:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();