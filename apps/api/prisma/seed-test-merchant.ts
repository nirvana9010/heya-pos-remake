import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedTestMerchant() {
  console.log('🌱 Creating comprehensive test merchant...\n');

  // 1. Get or create package
  let package_ = await prisma.package.findFirst({
    where: { name: 'Professional' }
  });

  if (!package_) {
    package_ = await prisma.package.create({
      data: {
        name: 'Professional',
        monthlyPrice: 99,
        trialDays: 30,
        maxLocations: 3,
        maxStaff: 20,
        maxCustomers: 5000,
        features: [
          'advanced_booking',
          'customer_management',
          'loyalty_program',
          'detailed_reports',
          'multi_location',
          'online_booking',
          'sms_reminders',
          'email_marketing'
        ],
      },
    });
  }

  // 2. Create test merchant
  const hashedPassword = await bcrypt.hash('testpassword123', 10);
  
  const merchant = await prisma.merchant.create({
    data: {
      name: 'Luxe Beauty & Wellness',
      email: 'admin@luxebeauty.com',
      phone: '+61 2 9876 5432',
      abn: '12345678901',
      subdomain: 'luxebeauty',
      packageId: package_.id,
      subscriptionStatus: 'ACTIVE',
      website: 'https://luxebeauty.com.au',
      description: 'Premium beauty and wellness services in Sydney CBD',
      settings: {
        currency: 'AUD',
        timezone: 'Australia/Sydney',
        bookingBuffer: 15,
        cancellationHours: 24,
        workingHours: {
          monday: { open: '09:00', close: '19:00' },
          tuesday: { open: '09:00', close: '19:00' },
          wednesday: { open: '09:00', close: '21:00' },
          thursday: { open: '09:00', close: '21:00' },
          friday: { open: '09:00', close: '19:00' },
          saturday: { open: '09:00', close: '17:00' },
          sunday: { open: '10:00', close: '16:00' }
        }
      },
    },
  });

  console.log(`✅ Created merchant: ${merchant.name}`);

  // 3. Create merchant auth
  await prisma.merchantAuth.create({
    data: {
      merchantId: merchant.id,
      username: 'luxeadmin',
      passwordHash: hashedPassword,
    },
  });

  // 4. Create locations
  const mainLocation = await prisma.location.create({
    data: {
      merchantId: merchant.id,
      name: 'Sydney CBD',
      address: '123 Pitt Street',
      suburb: 'Sydney',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      postalCode: '2000',
      phone: '+61 2 9876 5432',
      email: 'cbd@luxebeauty.com',
      timezone: 'Australia/Sydney',
      businessHours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '21:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '19:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { open: '10:00', close: '16:00' }
      },
      settings: {
        maxAdvanceBooking: 90,
        minAdvanceBooking: 2
      },
    },
  });

  const secondLocation = await prisma.location.create({
    data: {
      merchantId: merchant.id,
      name: 'Bondi Beach',
      address: '456 Campbell Parade',
      suburb: 'Bondi Beach',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      postalCode: '2026',
      phone: '+61 2 9876 5433',
      email: 'bondi@luxebeauty.com',
      timezone: 'Australia/Sydney',
      businessHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '20:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '08:00', close: '18:00' },
        sunday: { open: '09:00', close: '17:00' }
      },
      settings: {
        maxAdvanceBooking: 60,
        minAdvanceBooking: 1
      },
    },
  });

  console.log('✅ Created 2 locations');

  // 5. Create staff members
  const staffMembers = await Promise.all([
    // Owner
    prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'sarah.chen@luxebeauty.com',
        firstName: 'Sarah',
        lastName: 'Chen',
        phone: '+61 400 111 222',
        pin: await bcrypt.hash('1234', 10),
        accessLevel: 3,
        calendarColor: '#FF6B6B',
        commissionRate: 50,
        locations: {
          create: [
            { locationId: mainLocation.id, isPrimary: true },
            { locationId: secondLocation.id }
          ]
        }
      },
    }),
    // Senior therapists
    prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'emma.wilson@luxebeauty.com',
        firstName: 'Emma',
        lastName: 'Wilson',
        phone: '+61 400 222 333',
        pin: await bcrypt.hash('2345', 10),
        accessLevel: 2,
        calendarColor: '#4ECDC4',
        commissionRate: 40,
        locations: {
          create: [{ locationId: mainLocation.id, isPrimary: true }]
        }
      },
    }),
    prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'lisa.nguyen@luxebeauty.com',
        firstName: 'Lisa',
        lastName: 'Nguyen',
        phone: '+61 400 333 444',
        pin: await bcrypt.hash('3456', 10),
        accessLevel: 2,
        calendarColor: '#45B7D1',
        commissionRate: 40,
        locations: {
          create: [{ locationId: mainLocation.id, isPrimary: true }]
        }
      },
    }),
    // Regular therapists
    prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'jessica.brown@luxebeauty.com',
        firstName: 'Jessica',
        lastName: 'Brown',
        phone: '+61 400 444 555',
        pin: await bcrypt.hash('4567', 10),
        accessLevel: 1,
        calendarColor: '#F7DC6F',
        commissionRate: 35,
        locations: {
          create: [{ locationId: secondLocation.id, isPrimary: true }]
        }
      },
    }),
    prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'mia.taylor@luxebeauty.com',
        firstName: 'Mia',
        lastName: 'Taylor',
        phone: '+61 400 555 666',
        pin: await bcrypt.hash('5678', 10),
        accessLevel: 1,
        calendarColor: '#BB8FCE',
        commissionRate: 35,
        locations: {
          create: [{ locationId: mainLocation.id, isPrimary: true }]
        }
      },
    }),
  ]);

  console.log(`✅ Created ${staffMembers.length} staff members`);

  // 6. Create service categories
  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Facial Treatments',
        description: 'Advanced facial treatments for all skin types',
        icon: '✨',
        color: '#FFE5E5',
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Massage Therapy',
        description: 'Relaxation and therapeutic massage services',
        icon: '💆',
        color: '#E5F3FF',
        sortOrder: 2,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Body Treatments',
        description: 'Full body treatments and wraps',
        icon: '🧖',
        color: '#F0E5FF',
        sortOrder: 3,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Beauty Services',
        description: 'Nails, lashes, brows and makeup',
        icon: '💅',
        color: '#FFE5F3',
        sortOrder: 4,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} service categories`);

  // 7. Create services
  const services = await Promise.all([
    // Facial treatments
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[0].id,
        name: 'Signature Hydrating Facial',
        description: 'Deep cleansing facial with hydration boost',
        category: 'Facial Treatments',
        duration: 60,
        price: 150,
        displayOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[0].id,
        name: 'Anti-Aging Facial',
        description: 'Advanced treatment targeting fine lines and wrinkles',
        category: 'Facial Treatments',
        duration: 90,
        price: 220,
        requiresDeposit: true,
        depositAmount: 50,
        displayOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[0].id,
        name: 'Express Glow Facial',
        description: 'Quick refresh for glowing skin',
        category: 'Facial Treatments',
        duration: 30,
        price: 80,
        displayOrder: 3,
      },
    }),
    // Massage
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[1].id,
        name: 'Swedish Relaxation Massage',
        description: 'Full body relaxation massage',
        category: 'Massage Therapy',
        duration: 60,
        price: 120,
        displayOrder: 4,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[1].id,
        name: 'Deep Tissue Massage',
        description: 'Therapeutic massage for muscle tension',
        category: 'Massage Therapy',
        duration: 90,
        price: 180,
        displayOrder: 5,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[1].id,
        name: 'Hot Stone Massage',
        description: 'Relaxing massage with heated stones',
        category: 'Massage Therapy',
        duration: 75,
        price: 160,
        displayOrder: 6,
      },
    }),
    // Body treatments
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[2].id,
        name: 'Body Scrub & Wrap',
        description: 'Exfoliating scrub followed by nourishing wrap',
        category: 'Body Treatments',
        duration: 90,
        price: 200,
        displayOrder: 7,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[2].id,
        name: 'Detox Body Wrap',
        description: 'Detoxifying treatment with mineral-rich wrap',
        category: 'Body Treatments',
        duration: 60,
        price: 150,
        displayOrder: 8,
      },
    }),
    // Beauty services
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[3].id,
        name: 'Gel Manicure',
        description: 'Long-lasting gel polish manicure',
        category: 'Beauty Services',
        duration: 45,
        price: 65,
        displayOrder: 9,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[3].id,
        name: 'Lash Extensions',
        description: 'Full set of individual lash extensions',
        category: 'Beauty Services',
        duration: 120,
        price: 180,
        requiresDeposit: true,
        depositAmount: 50,
        displayOrder: 10,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[3].id,
        name: 'Brow Shaping & Tint',
        description: 'Professional brow shaping with tint',
        category: 'Beauty Services',
        duration: 30,
        price: 55,
        displayOrder: 11,
      },
    }),
    prisma.service.create({
      data: {
        merchantId: merchant.id,
        categoryId: categories[3].id,
        name: 'Makeup Application',
        description: 'Professional makeup for any occasion',
        category: 'Beauty Services',
        duration: 60,
        price: 120,
        displayOrder: 12,
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  // 8. Create customers
  const customers = await Promise.all([
    // VIP customers
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'olivia.mitchell@email.com',
        firstName: 'Olivia',
        lastName: 'Mitchell',
        phone: '+61 2 9111 2222',
        mobile: '+61 411 222 333',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'FEMALE',
        address: '789 George Street',
        suburb: 'Sydney',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        notes: 'VIP client - prefers afternoon appointments',
        tags: JSON.stringify(['vip', 'regular', 'skincare']),
        marketingConsent: true,
        visitCount: 45,
        totalSpent: 6750,
      },
    }),
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'sophia.anderson@email.com',
        firstName: 'Sophia',
        lastName: 'Anderson',
        phone: '+61 2 9222 3333',
        mobile: '+61 422 333 444',
        dateOfBirth: new Date('1978-07-22'),
        gender: 'FEMALE',
        address: '321 Kent Street',
        suburb: 'Sydney',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        notes: 'Sensitive skin - use hypoallergenic products',
        tags: JSON.stringify(['vip', 'sensitive-skin']),
        marketingConsent: true,
        visitCount: 38,
        totalSpent: 5320,
      },
    }),
    // Regular customers
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'emily.brown@email.com',
        firstName: 'Emily',
        lastName: 'Brown',
        mobile: '+61 433 444 555',
        dateOfBirth: new Date('1990-11-08'),
        gender: 'FEMALE',
        suburb: 'Bondi',
        city: 'Sydney',
        tags: JSON.stringify(['regular', 'massage']),
        marketingConsent: true,
        visitCount: 12,
        totalSpent: 1440,
      },
    }),
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'charlotte.davis@email.com',
        firstName: 'Charlotte',
        lastName: 'Davis',
        mobile: '+61 444 555 666',
        dateOfBirth: new Date('1995-02-28'),
        gender: 'FEMALE',
        tags: JSON.stringify(['beauty', 'nails']),
        marketingConsent: false,
        visitCount: 8,
        totalSpent: 520,
      },
    }),
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'james.wilson@email.com',
        firstName: 'James',
        lastName: 'Wilson',
        mobile: '+61 455 666 777',
        gender: 'MALE',
        notes: 'Prefers deep tissue massage',
        tags: JSON.stringify(['massage', 'therapeutic']),
        marketingConsent: true,
        visitCount: 6,
        totalSpent: 1080,
      },
    }),
    // New customers
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'isabella.martinez@email.com',
        firstName: 'Isabella',
        lastName: 'Martinez',
        mobile: '+61 466 777 888',
        gender: 'FEMALE',
        tags: JSON.stringify(['new']),
        marketingConsent: true,
        visitCount: 1,
        totalSpent: 150,
      },
    }),
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        firstName: 'Ava',
        lastName: 'Thompson',
        mobile: '+61 477 888 999',
        gender: 'FEMALE',
        source: 'WALK_IN',
        visitCount: 2,
        totalSpent: 235,
      },
    }),
    prisma.customer.create({
      data: {
        merchantId: merchant.id,
        email: 'michael.lee@email.com',
        firstName: 'Michael',
        lastName: 'Lee',
        mobile: '+61 488 999 000',
        gender: 'MALE',
        source: 'ONLINE',
        tags: JSON.stringify(['new', 'online']),
        visitCount: 1,
        totalSpent: 120,
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // 9. Create bookings with various statuses
  const now = new Date();
  const bookings = [];

  // Past completed bookings
  for (let i = 30; i > 0; i -= 3) {
    const bookingDate = new Date(now);
    bookingDate.setDate(bookingDate.getDate() - i);
    bookingDate.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const staff = staffMembers[Math.floor(Math.random() * staffMembers.length)];

    const booking = await prisma.booking.create({
      data: {
        merchantId: merchant.id,
        locationId: mainLocation.id,
        customerId: customer.id,
        bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 4)}`.toUpperCase(),
        status: 'COMPLETED',
        startTime: bookingDate,
        endTime: new Date(bookingDate.getTime() + service.duration * 60000),
        totalAmount: service.price,
        source: 'ONLINE',
        createdById: staff.id,
        providerId: staff.id,
        completedAt: new Date(bookingDate.getTime() + service.duration * 60000),
        services: {
          create: {
            serviceId: service.id,
            price: service.price,
            duration: service.duration,
            staffId: staff.id,
          },
        },
      },
    });
    bookings.push(booking);
  }

  // Today's bookings
  const todayBookings = [
    { hour: 9, status: 'COMPLETED', customer: customers[0], service: services[0] },
    { hour: 11, status: 'IN_PROGRESS', customer: customers[1], service: services[3] },
    { hour: 14, status: 'CONFIRMED', customer: customers[2], service: services[1] },
    { hour: 16, status: 'PENDING', customer: customers[3], service: services[8] },
  ];

  for (const tb of todayBookings) {
    const bookingTime = new Date(now);
    bookingTime.setHours(tb.hour, 0, 0, 0);
    
    const staff = staffMembers[Math.floor(Math.random() * 3)]; // Use first 3 staff for today

    const booking = await prisma.booking.create({
      data: {
        merchantId: merchant.id,
        locationId: mainLocation.id,
        customerId: tb.customer.id,
        bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 4)}`.toUpperCase(),
        status: tb.status as 'COMPLETED' | 'IN_PROGRESS' | 'CONFIRMED' | 'PENDING',
        startTime: bookingTime,
        endTime: new Date(bookingTime.getTime() + tb.service.duration * 60000),
        totalAmount: tb.service.price,
        source: 'ONLINE',
        createdById: staffMembers[0].id,
        providerId: staff.id,
        confirmedAt: tb.status !== 'PENDING' ? bookingTime : null,
        checkedInAt: ['IN_PROGRESS', 'COMPLETED'].includes(tb.status) ? bookingTime : null,
        completedAt: tb.status === 'COMPLETED' ? new Date(bookingTime.getTime() + tb.service.duration * 60000) : null,
        services: {
          create: {
            serviceId: tb.service.id,
            price: tb.service.price,
            duration: tb.service.duration,
            staffId: staff.id,
          },
        },
      },
    });
    bookings.push(booking);
  }

  // Future bookings
  const futureBookings = [
    { day: 1, hour: 10, customer: customers[4], service: services[2] },
    { day: 1, hour: 14, customer: customers[5], service: services[5] },
    { day: 2, hour: 11, customer: customers[0], service: services[1] },
    { day: 3, hour: 15, customer: customers[1], service: services[9] },
    { day: 7, hour: 10, customer: customers[2], service: services[4] },
  ];

  for (const fb of futureBookings) {
    const bookingTime = new Date(now);
    bookingTime.setDate(bookingTime.getDate() + fb.day);
    bookingTime.setHours(fb.hour, 0, 0, 0);
    
    const staff = staffMembers[Math.floor(Math.random() * staffMembers.length)];

    const booking = await prisma.booking.create({
      data: {
        merchantId: merchant.id,
        locationId: fb.day % 2 === 0 ? mainLocation.id : secondLocation.id,
        customerId: fb.customer.id,
        bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 4)}`.toUpperCase(),
        status: 'CONFIRMED',
        startTime: bookingTime,
        endTime: new Date(bookingTime.getTime() + fb.service.duration * 60000),
        totalAmount: fb.service.price,
        depositAmount: fb.service.requiresDeposit ? fb.service.depositAmount || 0 : 0,
        source: 'ONLINE',
        createdById: staffMembers[0].id,
        providerId: staff.id,
        confirmedAt: now,
        services: {
          create: {
            serviceId: fb.service.id,
            price: fb.service.price,
            duration: fb.service.duration,
            staffId: staff.id,
          },
        },
      },
    });
    bookings.push(booking);
  }

  // One cancelled booking
  const cancelledBooking = await prisma.booking.create({
    data: {
      merchantId: merchant.id,
      locationId: mainLocation.id,
      customerId: customers[6].id,
      bookingNumber: `BK${Date.now()}CANC`.toUpperCase(),
      status: 'CANCELLED',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      totalAmount: services[0].price,
      cancellationReason: 'Customer requested reschedule',
      source: 'PHONE',
      createdById: staffMembers[1].id,
      providerId: staffMembers[2].id,
      cancelledAt: now,
      services: {
        create: {
          serviceId: services[0].id,
          price: services[0].price,
          duration: services[0].duration,
          staffId: staffMembers[2].id,
        },
      },
    },
  });
  bookings.push(cancelledBooking);

  console.log(`✅ Created ${bookings.length} bookings`);

  // 10. Create invoices for completed bookings
  let invoiceCounter = 1000;
  const invoices = [];

  for (const booking of bookings.filter(b => b.status === 'COMPLETED')) {
    const invoice = await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        customerId: booking.customerId,
        bookingId: booking.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${(invoiceCounter++).toString().padStart(4, '0')}`,
        status: 'PAID',
        subtotal: booking.totalAmount / 1.1, // Remove GST
        taxAmount: booking.totalAmount - (booking.totalAmount / 1.1),
        totalAmount: booking.totalAmount,
        paidAmount: booking.totalAmount,
        dueDate: booking.startTime,
        createdById: booking.createdById,
        paidAt: booking.completedAt,
        items: {
          create: {
            description: `Booking ${booking.bookingNumber}`,
            quantity: 1,
            unitPrice: booking.totalAmount / 1.1,
            taxRate: 0.1,
            taxAmount: booking.totalAmount - (booking.totalAmount / 1.1),
            total: booking.totalAmount,
          },
        },
      },
    });

    // Create payment
    await prisma.payment.create({
      data: {
        merchantId: merchant.id,
        locationId: booking.locationId,
        invoiceId: invoice.id,
        paymentMethod: ['CASH', 'CARD', 'CARD_STRIPE'][Math.floor(Math.random() * 3)] as 'CASH' | 'CARD' | 'CARD_STRIPE',
        amount: booking.totalAmount,
        status: 'COMPLETED',
        processedAt: booking.completedAt,
      },
    });

    invoices.push(invoice);
  }

  console.log(`✅ Created ${invoices.length} invoices with payments`);

  // 11. Create loyalty program
  const loyaltyProgram = await prisma.loyaltyProgram.create({
    data: {
      merchantId: merchant.id,
      name: 'Luxe Rewards',
      description: 'Earn points on every visit and redeem for free services',
      type: 'SPEND',
      pointsPerDollar: 1,
      rewardThreshold: 100,
      rewardValue: 10,
      expiryDays: 365,
      terms: 'Points expire after 12 months. Cannot be combined with other offers.',
    },
  });

  // Create loyalty cards for regular customers
  const loyaltyCards = await Promise.all(
    customers.slice(0, 5).map(async (customer, index) => {
      // Retrieve the customer with totalSpent field
      const customerWithSpent = await prisma.customer.findUnique({
        where: { id: customer.id },
        select: { totalSpent: true }
      });
      
      const spentAmount = customerWithSpent?.totalSpent ? Number(customerWithSpent.totalSpent) : 0;
      
      return prisma.loyaltyCard.create({
        data: {
          programId: loyaltyProgram.id,
          customerId: customer.id,
          cardNumber: `LUX${new Date().getFullYear()}${(1000 + index).toString()}`,
          points: Math.floor(spentAmount * 0.1), // 10% of spend as points
          lifetimePoints: Math.floor(spentAmount * 0.1),
        },
      });
    })
  );

  console.log(`✅ Created loyalty program with ${loyaltyCards.length} cards`);

  // 12. Summary
  console.log('\n🎉 Test merchant creation complete!');
  console.log('================================');
  console.log(`Merchant: ${merchant.name}`);
  console.log(`Subdomain: ${merchant.subdomain}`);
  console.log(`Login: luxeadmin / testpassword123`);
  console.log(`Staff PINs: 1234 (Sarah), 2345 (Emma), 3456 (Lisa), 4567 (Jessica), 5678 (Mia)`);
  console.log('\nData created:');
  console.log(`- ${await prisma.location.count({ where: { merchantId: merchant.id } })} locations`);
  console.log(`- ${await prisma.staff.count({ where: { merchantId: merchant.id } })} staff members`);
  console.log(`- ${await prisma.serviceCategory.count({ where: { merchantId: merchant.id } })} service categories`);
  console.log(`- ${await prisma.service.count({ where: { merchantId: merchant.id } })} services`);
  console.log(`- ${await prisma.customer.count({ where: { merchantId: merchant.id } })} customers`);
  console.log(`- ${await prisma.booking.count({ where: { merchantId: merchant.id } })} bookings`);
  console.log(`- ${await prisma.invoice.count({ where: { merchantId: merchant.id } })} invoices`);
  console.log(`- ${await prisma.loyaltyCard.count({ where: { customerId: { in: customers.map(c => c.id) } } })} loyalty cards`);

  return merchant;
}

// Run the seed
seedTestMerchant()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding test merchant:', e);
    await prisma.$disconnect();
    process.exit(1);
  });