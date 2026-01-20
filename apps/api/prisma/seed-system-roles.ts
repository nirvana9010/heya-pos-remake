import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * System roles that are available to all merchants.
 * These roles have merchantId = null, making them global.
 */
/**
 * Permission naming conventions (must match controller decorators):
 * - booking.* (singular) - booking.read, booking.create, booking.update, booking.delete
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
    name: 'Admin',
    description: 'Full access except billing settings',
    permissions: [
      // Bookings (singular)
      'booking.read',
      'booking.create',
      'booking.update',
      'booking.delete',
      // Customers (plural, uses 'read' not 'view')
      'customers.read',
      'customers.create',
      'customers.update',
      'customers.delete',
      'customers.export',
      'customers.import',
      // Staff
      'staff.view',
      'staff.create',
      'staff.update',
      'staff.delete',
      // Services (singular)
      'service.view',
      'service.create',
      'service.update',
      'service.delete',
      // Payments
      'payment.view',
      'payment.create',
      'payment.process',
      'payment.refund',
      // Reports
      'reports.view',
      'reports.export',
      // Settings (excluding billing)
      'settings.view',
      'settings.update',
    ],
    isSystem: true,
  },
  {
    name: 'Manager',
    description: 'Manage daily operations, bookings, customers, and view reports',
    permissions: [
      // Bookings
      'booking.read',
      'booking.create',
      'booking.update',
      // Customers
      'customers.read',
      'customers.create',
      'customers.update',
      // Staff (view only)
      'staff.view',
      // Services (view only)
      'service.view',
      // Payments
      'payment.view',
      'payment.create',
      'payment.process',
      // Reports (view only)
      'reports.view',
    ],
    isSystem: true,
  },
  {
    name: 'Receptionist',
    description: 'Handle bookings, view customers, and process payments',
    permissions: [
      // Bookings
      'booking.read',
      'booking.create',
      'booking.update',
      // Customers
      'customers.read',
      'customers.create',
      // Services (view only)
      'service.view',
      // Payments
      'payment.view',
      'payment.create',
      'payment.process',
    ],
    isSystem: true,
  },
  {
    name: 'View Only',
    description: 'Read-only access to all data',
    permissions: [
      'booking.read',
      'customers.read',
      'staff.view',
      'service.view',
      'payment.view',
      'reports.view',
      'settings.view',
    ],
    isSystem: true,
  },
];

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

  console.log('✅ System roles seeded successfully');
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
