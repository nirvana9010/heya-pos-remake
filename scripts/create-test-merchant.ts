import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestMerchant() {
  console.log('🏪 Creating test merchant: Zen Wellness Spa');

  try {
    // Check if merchant already exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { subdomain: 'zen-wellness' }
    });

    if (existingMerchant) {
      console.log('❌ Merchant with subdomain "zen-wellness" already exists');
      return;
    }

    // Get the professional package
    const professionalPackage = await prisma.package.findUnique({
      where: { name: 'Professional' }
    });

    if (!professionalPackage) {
      throw new Error('Professional package not found. Run main seed first.');
    }

    // Create merchant
    const merchant = await prisma.merchant.create({
      data: {
        name: 'Zen Wellness Spa',
        email: 'admin@zenwellness.com',
        phone: '+61 3 9876 5432',
        abn: '98765432109',
        subdomain: 'zen-wellness',
        packageId: professionalPackage.id,
        subscriptionStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        website: 'https://zenwellness.com',
        description: 'Holistic wellness and relaxation spa',
        settings: {
          currency: 'AUD',
          timezone: 'Australia/Sydney',
          bookingBuffer: 15,
          cancellationHours: 24,
          bookingAdvanceHours: 336, // 14 days
          loyaltyType: 'points',
          loyaltyRate: 10, // 10 points per dollar
          requirePinForRefunds: true,
          requirePinForCancellations: true,
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          requireDeposit: false,
          depositPercentage: 0,
        },
      },
    });

    // Create merchant auth
    await prisma.merchantAuth.create({
      data: {
        merchantId: merchant.id,
        username: 'ZENWELLNESS',
        passwordHash: await bcrypt.hash('demo456', 10),
      },
    });

    // Create location
    const location = await prisma.location.create({
      data: {
        merchantId: merchant.id,
        name: 'Zen Wellness Main',
        address: '456 Wellness Way',
        suburb: 'Melbourne',
        city: 'Melbourne',
        state: 'VIC',
        country: 'Australia',
        postalCode: '3000',
        phone: '+61 3 9876 5432',
        email: 'melbourne@zenwellness.com',
        timezone: 'Australia/Sydney',
        businessHours: {
          monday: { open: '10:00', close: '20:00' },
          tuesday: { open: '10:00', close: '20:00' },
          wednesday: { open: '10:00', close: '20:00' },
          thursday: { open: '10:00', close: '21:00' },
          friday: { open: '10:00', close: '21:00' },
          saturday: { open: '09:00', close: '18:00' },
          sunday: { open: '10:00', close: '17:00' },
        },
        isActive: true,
        settings: {
          checkInRequired: false,
          autoCompleteBookings: false,
        },
      },
    });

    // Create staff
    const staff1 = await prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'sophia@zenwellness.com',
        firstName: 'Sophia',
        lastName: 'Chen',
        phone: '+61 412 345 678',
        pin: await bcrypt.hash('1234', 10),
        accessLevel: 2, // manager
        calendarColor: '#9B59B6',
        status: 'ACTIVE',
      },
    });

    const staff2 = await prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'james@zenwellness.com',
        firstName: 'James',
        lastName: 'Wilson',
        phone: '+61 423 456 789',
        pin: await bcrypt.hash('5678', 10),
        accessLevel: 1, // employee
        calendarColor: '#3498DB',
        status: 'ACTIVE',
      },
    });

    // Assign staff to location
    await prisma.staffLocation.createMany({
      data: [
        { staffId: staff1.id, locationId: location.id, isPrimary: true },
        { staffId: staff2.id, locationId: location.id, isPrimary: true },
      ],
    });

    // Create service categories
    const yogaCategory = await prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Yoga & Meditation',
        description: 'Mind and body wellness classes',
        icon: 'yoga',
        color: '#E74C3C',
        sortOrder: 1,
      },
    });

    const massageCategory = await prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Therapeutic Massage',
        description: 'Healing massage therapies',
        icon: 'spa',
        color: '#2ECC71',
        sortOrder: 2,
      },
    });

    const wellnessCategory = await prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Wellness Treatments',
        description: 'Holistic wellness services',
        icon: 'heart',
        color: '#F39C12',
        sortOrder: 3,
      },
    });

    // Create services
    await prisma.service.createMany({
      data: [
        // Yoga & Meditation
        {
          merchantId: merchant.id,
          categoryId: yogaCategory.id,
          name: 'Hatha Yoga Class',
          description: 'Gentle yoga for all levels',
          category: 'Yoga & Meditation',
          duration: 60,
          price: 25,
          displayOrder: 1,
        },
        {
          merchantId: merchant.id,
          categoryId: yogaCategory.id,
          name: 'Meditation Session',
          description: 'Guided meditation for inner peace',
          category: 'Yoga & Meditation',
          duration: 45,
          price: 20,
          displayOrder: 2,
        },
        {
          merchantId: merchant.id,
          categoryId: yogaCategory.id,
          name: 'Private Yoga Session',
          description: 'One-on-one personalized yoga',
          category: 'Yoga & Meditation',
          duration: 90,
          price: 120,
          displayOrder: 3,
        },
        // Therapeutic Massage
        {
          merchantId: merchant.id,
          categoryId: massageCategory.id,
          name: 'Deep Tissue Massage',
          description: 'Therapeutic massage for muscle tension',
          category: 'Therapeutic Massage',
          duration: 60,
          price: 110,
          displayOrder: 4,
        },
        {
          merchantId: merchant.id,
          categoryId: massageCategory.id,
          name: 'Aromatherapy Massage',
          description: 'Relaxing massage with essential oils',
          category: 'Therapeutic Massage',
          duration: 90,
          price: 140,
          displayOrder: 5,
        },
        {
          merchantId: merchant.id,
          categoryId: massageCategory.id,
          name: 'Thai Massage',
          description: 'Traditional Thai stretching massage',
          category: 'Therapeutic Massage',
          duration: 120,
          price: 160,
          displayOrder: 6,
        },
        // Wellness Treatments
        {
          merchantId: merchant.id,
          categoryId: wellnessCategory.id,
          name: 'Reiki Healing',
          description: 'Energy healing session',
          category: 'Wellness Treatments',
          duration: 60,
          price: 95,
          displayOrder: 7,
        },
        {
          merchantId: merchant.id,
          categoryId: wellnessCategory.id,
          name: 'Acupuncture',
          description: 'Traditional Chinese medicine treatment',
          category: 'Wellness Treatments',
          duration: 75,
          price: 130,
          displayOrder: 8,
        },
        {
          merchantId: merchant.id,
          categoryId: wellnessCategory.id,
          name: 'Wellness Consultation',
          description: 'Holistic health assessment and planning',
          category: 'Wellness Treatments',
          duration: 45,
          price: 80,
          displayOrder: 9,
        },
      ],
    });

    // Create a few customers
    await prisma.customer.createMany({
      data: [
        {
          merchantId: merchant.id,
          firstName: 'Alice',
          lastName: 'Green',
          email: 'alice.green@email.com',
          phone: '+61 400 111 222',
          source: 'WALK_IN',
        },
        {
          merchantId: merchant.id,
          firstName: 'Bob',
          lastName: 'Taylor',
          email: 'bob.taylor@email.com',
          phone: '+61 400 333 444',
          source: 'ONLINE',
        },
      ],
    });

    console.log('✅ Successfully created Zen Wellness Spa merchant');
    console.log('');
    console.log('📋 Test Credentials:');
    console.log('Merchant Login:');
    console.log('  Username: ZENWELLNESS');
    console.log('  Password: demo456');
    console.log('');
    console.log('Booking App URL:');
    console.log('  http://localhost:3001/zen-wellness');
    console.log('');
    console.log('Staff PINs:');
    console.log('  Sophia Chen (Manager): 1234');
    console.log('  James Wilson: 5678');
  } catch (error) {
    console.error('❌ Error creating test merchant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMerchant();