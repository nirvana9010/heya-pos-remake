import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.loyaltyTransaction.deleteMany(),
    prisma.loyaltyCard.deleteMany(),
    prisma.loyaltyTier.deleteMany(),
    prisma.loyaltyProgram.deleteMany(),
    prisma.paymentRefund.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.bookingService.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.service.deleteMany(),
    prisma.serviceCategory.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.staffLocation.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.location.deleteMany(),
    prisma.merchantAuth.deleteMany(),
    prisma.merchant.deleteMany(),
    prisma.package.deleteMany(),
  ]);

  // Create packages
  const starterPackage = await prisma.package.create({
    data: {
      name: 'Starter',
      monthlyPrice: 49,
      trialDays: 30,
      maxLocations: 1,
      maxStaff: 5,
      maxCustomers: 1000,
      features: ['basic_booking', 'customer_management', 'basic_reports'],
    },
  });

  const professionalPackage = await prisma.package.create({
    data: {
      name: 'Professional',
      monthlyPrice: 99,
      trialDays: 30,
      maxLocations: 3,
      maxStaff: 15,
      maxCustomers: 5000,
      features: ['advanced_booking', 'customer_management', 'advanced_reports', 'loyalty_program', 'multi_location'],
    },
  });

  // Create merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: 'Hamilton Beauty Spa',
      email: 'admin@hamiltonbeauty.com',
      phone: '+61 2 9456 7890',
      abn: '12345678901',
      subdomain: 'hamilton',
      packageId: professionalPackage.id,
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      website: 'https://hamiltonbeauty.com',
      logo: 'https://via.placeholder.com/300x100/FF69B4/FFFFFF?text=Hamilton+Beauty',
      description: 'Premium beauty and wellness spa in Hamilton',
      settings: {
        currency: 'AUD',
        timezone: 'Australia/Sydney',
        bookingBuffer: 15, // minutes between bookings
        cancellationHours: 24,
        bookingAdvanceHours: 168, // 7 days
        loyaltyType: 'visit',
        loyaltyRate: 1,
        requirePinForRefunds: true,
        requirePinForCancellations: true,
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        // Payment settings
        requireDeposit: true,
        depositPercentage: 30, // 30% deposit required
        // Unassigned booking settings
        showUnassignedColumn: false,
        allowUnassignedBookings: false,
        // Calendar display settings
        calendarStartHour: 6,
        calendarEndHour: 23,
        // Walk-in settings
        allowWalkInBookings: true,
      },
    },
  });

  // Create merchant auth
  await prisma.merchantAuth.create({
    data: {
      merchantId: merchant.id,
      username: 'HAMILTON',
      passwordHash: await bcrypt.hash('demo123', 10),
    },
  });

  // Create location
  const location = await prisma.location.create({
    data: {
      merchantId: merchant.id,
      name: 'Hamilton Main',
      address: '123 Beauty Street',
      suburb: 'Hamilton',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      postalCode: '2000',
      phone: '+61 2 9456 7890',
      email: 'hamilton@hamiltonbeauty.com',
      timezone: 'Australia/Sydney',
      businessHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '20:00' },
        thursday: { open: '09:00', close: '20:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { open: '10:00', close: '16:00' },
      },
      settings: {},
    },
  });

  // Create staff members
  const staff1 = await prisma.staff.create({
    data: {
      merchantId: merchant.id,
      email: 'sarah@hamiltonbeauty.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+61 412 345 678',
      pin: await bcrypt.hash('1234', 10),
      accessLevel: 3, // owner
      calendarColor: '#7C3AED', // Purple
      status: 'ACTIVE',
    },
  });

  const staff2 = await prisma.staff.create({
    data: {
      merchantId: merchant.id,
      email: 'emma@hamiltonbeauty.com',
      firstName: 'Emma',
      lastName: 'Williams',
      phone: '+61 423 456 789',
      pin: await bcrypt.hash('5678', 10),
      accessLevel: 2, // manager
      calendarColor: '#14B8A6', // Teal
      status: 'ACTIVE',
    },
  });

  const staff3 = await prisma.staff.create({
    data: {
      merchantId: merchant.id,
      email: 'olivia@hamiltonbeauty.com',
      firstName: 'Olivia',
      lastName: 'Brown',
      phone: '+61 434 567 890',
      pin: await bcrypt.hash('9012', 10),
      accessLevel: 1, // employee
      calendarColor: '#F59E0B', // Amber
      status: 'ACTIVE',
    },
  });

  // Assign staff to location
  await prisma.staffLocation.createMany({
    data: [
      { staffId: staff1.id, locationId: location.id, isPrimary: true },
      { staffId: staff2.id, locationId: location.id, isPrimary: true },
      { staffId: staff3.id, locationId: location.id, isPrimary: true },
    ],
  });

  // Create service categories
  const facialCategory = await prisma.serviceCategory.create({
    data: {
      merchantId: merchant.id,
      name: 'Facials',
      description: 'Rejuvenating facial treatments',
      icon: 'face',
      color: '#FFB6C1',
      sortOrder: 1,
    },
  });

  const massageCategory = await prisma.serviceCategory.create({
    data: {
      merchantId: merchant.id,
      name: 'Massages',
      description: 'Relaxing massage therapies',
      icon: 'spa',
      color: '#87CEEB',
      sortOrder: 2,
    },
  });

  const nailsCategory = await prisma.serviceCategory.create({
    data: {
      merchantId: merchant.id,
      name: 'Nails',
      description: 'Manicure and pedicure services',
      icon: 'brush',
      color: '#FFD700',
      sortOrder: 3,
    },
  });

  // Create services
  await prisma.service.createMany({
    data: [
      // Facials
      {
        merchantId: merchant.id,
        categoryId: facialCategory.id,
        name: 'Classic Facial',
        description: 'Deep cleansing facial with extractions',
        category: 'Facials',
        duration: 60,
        price: 120,
        displayOrder: 1,
      },
      {
        merchantId: merchant.id,
        categoryId: facialCategory.id,
        name: 'Anti-Aging Facial',
        description: 'Advanced treatment with peptides and retinol',
        category: 'Facials',
        duration: 90,
        price: 180,
        displayOrder: 2,
      },
      {
        merchantId: merchant.id,
        categoryId: facialCategory.id,
        name: 'Express Facial',
        description: 'Quick refresh for busy schedules',
        category: 'Facials',
        duration: 30,
        price: 75,
        displayOrder: 3,
      },
      // Massages
      {
        merchantId: merchant.id,
        categoryId: massageCategory.id,
        name: 'Swedish Massage',
        description: 'Classic relaxation massage',
        category: 'Massages',
        duration: 60,
        price: 110,
        displayOrder: 1,
      },
      {
        merchantId: merchant.id,
        categoryId: massageCategory.id,
        name: 'Deep Tissue Massage',
        description: 'Intensive muscle therapy',
        category: 'Massages',
        duration: 60,
        price: 130,
        displayOrder: 2,
      },
      {
        merchantId: merchant.id,
        categoryId: massageCategory.id,
        name: 'Hot Stone Massage',
        description: 'Therapeutic massage with heated stones',
        category: 'Massages',
        duration: 90,
        price: 160,
        displayOrder: 3,
      },
      // Nails
      {
        merchantId: merchant.id,
        categoryId: nailsCategory.id,
        name: 'Classic Manicure',
        description: 'Traditional manicure with polish',
        category: 'Nails',
        duration: 45,
        price: 55,
        displayOrder: 1,
      },
      {
        merchantId: merchant.id,
        categoryId: nailsCategory.id,
        name: 'Gel Manicure',
        description: 'Long-lasting gel polish application',
        category: 'Nails',
        duration: 60,
        price: 75,
        displayOrder: 2,
      },
      {
        merchantId: merchant.id,
        categoryId: nailsCategory.id,
        name: 'Spa Pedicure',
        description: 'Luxurious foot treatment with massage',
        category: 'Nails',
        duration: 60,
        price: 85,
        displayOrder: 3,
      },
    ],
  });

  // Create customers
  const customer1 = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      email: 'jane.smith@email.com',
      firstName: 'Jane',
      lastName: 'Smith',
      mobile: '+61 412 345 678',
      gender: 'FEMALE',
      address: '45 Beach Road',
      suburb: 'Bondi',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2026',
      marketingConsent: true,
      notes: 'Prefers morning appointments',
      tags: [],
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      email: 'mary.davis@email.com',
      firstName: 'Mary',
      lastName: 'Davis',
      mobile: '+61 423 456 789',
      gender: 'FEMALE',
      address: '78 Park Avenue',
      suburb: 'Neutral Bay',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2089',
      marketingConsent: true,
      notes: 'Allergic to certain oils',
      tags: [],
    },
  });

  // Create loyalty program
  const loyaltyProgram = await prisma.loyaltyProgram.create({
    data: {
      merchantId: merchant.id,
      name: 'Beauty Rewards',
      description: 'Earn points on every visit',
      type: 'SPEND',
      pointsPerDollar: 1,
      rewardThreshold: 100,
      rewardValue: 10,
      expiryDays: 365,
      terms: 'Points expire after 12 months. Rewards can be redeemed on services only.',
    },
  });

  // Create loyalty cards
  await prisma.loyaltyCard.createMany({
    data: [
      {
        programId: loyaltyProgram.id,
        customerId: customer1.id,
        cardNumber: 'HB-001234',
        points: 250,
        lifetimePoints: 1250,
      },
      {
        programId: loyaltyProgram.id,
        customerId: customer2.id,
        cardNumber: 'HB-001235',
        points: 150,
        lifetimePoints: 500,
      },
    ],
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });