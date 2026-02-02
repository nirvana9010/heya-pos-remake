import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * System roles that are available to all merchants.
 * These roles have merchantId = null, making them global.
 *
 * Simplified for nail salon use case: Owner, Manager, Staff
 */
/**
 * Permission naming conventions (must match controller decorators):
 * - booking.* (singular) - booking.read, booking.create, booking.update, booking.cancel, booking.delete
 * - customers.* (plural) - customers.read, customers.create, customers.update, customers.delete, customers.export, customers.import
 * - service.* (singular) - service.view, service.create, service.update, service.delete
 * - staff.* - staff.view, staff.create, staff.update, staff.delete
 * - settings.* - settings.view, settings.update, settings.billing
 * - payment.* - payment.create, payment.view, payment.process, payment.refund
 * - reports.* - reports.view, reports.export
 */
const SYSTEM_ROLES = [
  {
    name: 'Owner',
    description: 'Full access to all features and settings',
    permissions: ['*'],
    isSystem: true,
  },
  {
    name: 'Manager',
    description: 'Manage daily operations, bookings, customers, payments, and view reports',
    permissions: [
      // Bookings
      'booking.read',
      'booking.create',
      'booking.update',
      'booking.cancel',
      // Customers
      'customers.read',
      'customers.create',
      'customers.update',
      // Staff (view only)
      'staff.view',
      // Services (view only)
      'service.view',
      // Payments (including refunds)
      'payment.view',
      'payment.create',
      'payment.process',
      'payment.refund',
      // Reports (view only)
      'reports.view',
      // Settings (view only)
      'settings.view',
    ],
    isSystem: true,
  },
  {
    name: 'Staff',
    description: 'Handle bookings, customers, and process payments',
    permissions: [
      // Bookings (including cancel)
      'booking.read',
      'booking.create',
      'booking.update',
      'booking.cancel',
      // Customers
      'customers.read',
      'customers.create',
      // Services (view only)
      'service.view',
      // Payments (no refunds)
      'payment.view',
      'payment.create',
      'payment.process',
    ],
    isSystem: true,
  },
];

// Roles to deprecate (will be hidden from UI by setting isSystem=false)
const DEPRECATED_ROLES = ['Admin', 'Receptionist', 'View Only'];

async function seedSystemRoles() {
  console.log('🔑 Seeding system roles...');

  for (const role of SYSTEM_ROLES) {
    // Find existing system role by name (where merchantId is null)
    const existing = await prisma.merchantRole.findFirst({
      where: {
        merchantId: null,
        name: role.name,
      },
    });

    if (existing) {
      // Update existing role
      await prisma.merchantRole.update({
        where: { id: existing.id },
        data: {
          description: role.description,
          permissions: role.permissions,
          isSystem: role.isSystem,
        },
      });
      console.log(`  ✓ ${role.name} role updated`);
    } else {
      // Create new role
      await prisma.merchantRole.create({
        data: {
          merchantId: null,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: role.isSystem,
        },
      });
      console.log(`  ✓ ${role.name} role created`);
    }
  }

  // Deprecate old roles by setting isSystem=false (hides from UI)
  console.log('\n🧹 Deprecating unused roles...');
  for (const roleName of DEPRECATED_ROLES) {
    const role = await prisma.merchantRole.findFirst({
      where: {
        merchantId: null,
        name: roleName,
        isSystem: true,
      },
    });

    if (role) {
      // Check if any users are assigned to this role
      const userCount = await prisma.merchantUser.count({
        where: { roleId: role.id },
      });

      if (userCount > 0) {
        console.log(`  ⚠ ${roleName} role has ${userCount} user(s) - keeping active`);
      } else {
        await prisma.merchantRole.update({
          where: { id: role.id },
          data: { isSystem: false },
        });
        console.log(`  ✓ ${roleName} role deprecated (isSystem=false)`);
      }
    }
  }

  console.log('\n✅ System roles seeded successfully');
}

async function main() {
  await seedSystemRoles();
}

main()
  .catch((e) => {
    console.error('Error seeding system roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedSystemRoles, SYSTEM_ROLES };
