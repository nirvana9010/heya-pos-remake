import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive Hamilton Beauty Spa data seeding...');

  // Find the existing Hamilton merchant
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: 'hamilton' }
  });

  if (!merchant) {
    console.error('❌ Hamilton merchant not found. Please run the main seed.ts first.');
    return;
  }

  // Get related data
  const locations = await prisma.location.findMany({
    where: { merchantId: merchant.id }
  });
  const location = locations[0];

  const staff = await prisma.staff.findMany({
    where: { merchantId: merchant.id }
  });

  const services = await prisma.service.findMany({
    where: { merchantId: merchant.id }
  });

  const existingCustomers = await prisma.customer.findMany({
    where: { merchantId: merchant.id }
  });

  console.log('✅ Found Hamilton merchant with', staff.length, 'staff and', services.length, 'services');

  // Create more diverse customers if they don't exist
  const customerData = [
    {
      email: 'robert.chen@email.com',
      firstName: 'Robert',
      lastName: 'Chen',
      mobile: '+61 401 234 567',
      gender: 'MALE',
      dateOfBirth: new Date('1985-03-15'),
      address: '123 George Street',
      suburb: 'Sydney',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      marketingConsent: true,
      notes: 'VIP customer, prefers weekend appointments',
      tags: JSON.stringify(['VIP', 'Regular']),
    },
    {
      email: 'lisa.anderson@email.com',
      firstName: 'Lisa',
      lastName: 'Anderson',
      mobile: '+61 402 345 678',
      gender: 'FEMALE',
      dateOfBirth: new Date('1990-07-22'),
      address: '456 Pitt Street',
      suburb: 'Haymarket',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      marketingConsent: false,
      notes: 'Sensitive skin, requires patch tests',
      tags: JSON.stringify(['Sensitive Skin']),
    },
    {
      email: 'michael.wong@email.com',
      firstName: 'Michael',
      lastName: 'Wong',
      mobile: '+61 403 456 789',
      gender: 'MALE',
      dateOfBirth: new Date('1978-11-30'),
      address: '789 Kent Street',
      suburb: 'Millers Point',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      marketingConsent: true,
      notes: 'Corporate account, sends team members',
      tags: JSON.stringify(['Corporate', 'Bulk Bookings']),
    },
    {
      email: 'sophie.martin@email.com',
      firstName: 'Sophie',
      lastName: 'Martin',
      mobile: '+61 404 567 890',
      gender: 'FEMALE',
      dateOfBirth: new Date('1995-02-14'),
      address: '321 Sussex Street',
      suburb: 'Darling Harbour',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      marketingConsent: true,
      notes: 'Influencer, often posts reviews',
      tags: JSON.stringify(['Influencer', 'Social Media']),
    },
    {
      email: 'david.taylor@email.com',
      firstName: 'David',
      lastName: 'Taylor',
      mobile: '+61 405 678 901',
      gender: 'MALE',
      dateOfBirth: new Date('1982-09-05'),
      address: '654 Elizabeth Street',
      suburb: 'Surry Hills',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2010',
      marketingConsent: true,
      notes: 'Prefers early morning appointments',
      tags: JSON.stringify(['Early Bird']),
    },
    {
      email: 'emma.wilson@email.com',
      firstName: 'Emma',
      lastName: 'Wilson',
      mobile: '+61 406 789 012',
      gender: 'FEMALE',
      dateOfBirth: new Date('1988-12-20'),
      address: '987 Crown Street',
      suburb: 'Darlinghurst',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2010',
      marketingConsent: true,
      notes: 'Regular for massages, monthly subscription',
      tags: JSON.stringify(['Subscription', 'Massage Regular']),
    },
    {
      email: 'james.brown@email.com',
      firstName: 'James',
      lastName: 'Brown',
      mobile: '+61 407 890 123',
      gender: 'MALE',
      dateOfBirth: new Date('1975-04-18'),
      address: '246 Oxford Street',
      suburb: 'Paddington',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2021',
      marketingConsent: false,
      notes: 'Walk-in customer, pays cash',
      tags: JSON.stringify(['Walk-in', 'Cash']),
    },
    {
      email: 'olivia.johnson@email.com',
      firstName: 'Olivia',
      lastName: 'Johnson',
      mobile: '+61 408 901 234',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-06-25'),
      address: '135 King Street',
      suburb: 'Newtown',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2042',
      marketingConsent: true,
      notes: 'Group bookings for bridal parties',
      tags: JSON.stringify(['Group Bookings', 'Events']),
    },
  ];

  const newCustomers = [];
  for (const data of customerData) {
    const existing = await prisma.customer.findFirst({
      where: {
        merchantId: merchant.id,
        OR: [
          { email: data.email },
          { mobile: data.mobile }
        ]
      }
    });

    if (!existing) {
      const customer = await prisma.customer.create({
        data: {
          merchantId: merchant.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          mobile: data.mobile,
          gender: data.gender as any,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          suburb: data.suburb,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          marketingConsent: data.marketingConsent,
          notes: data.notes,
          tags: data.tags,
        }
      });
      newCustomers.push(customer);
    }
  }

  // Combine existing and new customers
  const allCustomers = [...existingCustomers, ...newCustomers];
  
  console.log('✅ Created', newCustomers.length, 'new customers');

  // Helper function to get random items from array
  const getRandomItems = <T>(array: T[], count: number): T[] => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Helper function to get a date/time
  const getBookingDateTime = (daysOffset: number, hour: number, minute: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  // Create bookings for different time periods
  const bookings = [];

  // 1. Past bookings (last 30 days) - mix of completed, cancelled, no-show
  console.log('📅 Creating past bookings...');
  for (let i = 30; i > 0; i--) {
    const numBookings = Math.floor(Math.random() * 4) + 1; // 1-4 bookings per day
    
    for (let j = 0; j < numBookings; j++) {
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const selectedStaff = staff[Math.floor(Math.random() * staff.length)];
      const selectedServices = getRandomItems(services, Math.floor(Math.random() * 2) + 1);
      const startHour = 9 + Math.floor(Math.random() * 9); // 9am-5pm
      const startTime = getBookingDateTime(-i, startHour, Math.random() > 0.5 ? 0 : 30);
      const duration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      // Determine status based on probability
      let status: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      const rand = Math.random();
      if (rand < 0.7) status = 'COMPLETED';
      else if (rand < 0.9) status = 'CANCELLED';
      else status = 'NO_SHOW';

      const booking = await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          providerId: selectedStaff.id,
          createdById: selectedStaff.id,
          bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalAmount: selectedServices.reduce((sum, s) => sum + s.price, 0),
          status,
          source: 'ONLINE',
          notes: status === 'CANCELLED' ? 'Customer cancelled due to schedule conflict' : 
                 status === 'NO_SHOW' ? 'Customer did not show up' : 
                 'Service completed successfully',
        },
      });

      // Create booking services
      await prisma.bookingService.createMany({
        data: selectedServices.map(service => ({
          bookingId: booking.id,
          serviceId: service.id,
          price: service.price,
          duration: service.duration,
          staffId: selectedStaff.id,
        })),
      });

      // Create invoice and payment for completed bookings
      if (status === 'COMPLETED') {
        const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
        
        const invoice = await prisma.invoice.create({
          data: {
            merchantId: merchant.id,
            bookingId: booking.id,
            customerId: customer.id,
            invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            dueDate: endTime,
            subtotal: totalAmount,
            taxAmount: totalAmount * 0.1, // 10% GST
            totalAmount: totalAmount * 1.1,
            paidAmount: totalAmount * 1.1,
            status: 'PAID',
            createdById: selectedStaff.id,
            paidAt: endTime,
            items: {
              create: selectedServices.map(service => ({
                description: service.name,
                quantity: 1,
                unitPrice: service.price,
                taxAmount: service.price * 0.1,
                total: service.price * 1.1,
              })),
            },
          },
        });

        // Create payment
        const paymentMethods = ['CASH', 'CARD', 'CARD_TYRO'];
        await prisma.payment.create({
          data: {
            merchantId: merchant.id,
            locationId: location.id,
            invoiceId: invoice.id,
            amount: totalAmount * 1.1,
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)] as any,
            status: 'COMPLETED',
            reference: `PAY-${Date.now()}`,
            processedAt: endTime,
          },
        });
      }

      bookings.push(booking);
    }
  }

  // 2. Today's bookings - mix of statuses
  console.log('📅 Creating today\'s bookings...');
  const today = new Date();
  const currentHour = today.getHours();
  
  // Past appointments today (completed or no-show)
  for (let hour = 9; hour < currentHour; hour++) {
    if (Math.random() > 0.3) { // 70% chance of booking
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const selectedStaff = staff[Math.floor(Math.random() * staff.length)];
      const selectedServices = getRandomItems(services, 1);
      const startTime = getBookingDateTime(0, hour, 0);
      const duration = selectedServices[0].duration;
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      const status = Math.random() > 0.1 ? 'COMPLETED' : 'NO_SHOW';

      const booking = await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          providerId: selectedStaff.id,
          createdById: selectedStaff.id,
          bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalAmount: selectedServices[0].price,
          status,
          source: 'WALK_IN',
        },
      });

      await prisma.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: selectedServices[0].id,
          price: selectedServices[0].price,
          duration: selectedServices[0].duration,
          staffId: selectedStaff.id,
        },
      });
    }
  }

  // Current/upcoming appointments today
  for (let hour = currentHour; hour <= 20; hour++) {
    if (Math.random() > 0.4) { // 60% chance of booking
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const selectedStaff = staff[Math.floor(Math.random() * staff.length)];
      const selectedServices = getRandomItems(services, Math.floor(Math.random() * 2) + 1);
      const startTime = getBookingDateTime(0, hour, Math.random() > 0.5 ? 0 : 30);
      const duration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const booking = await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          providerId: selectedStaff.id,
          createdById: selectedStaff.id,
          bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalAmount: selectedServices.reduce((sum, s) => sum + s.price, 0),
          status: 'CONFIRMED',
          source: 'PHONE',
          reminderSent: Math.random() > 0.5,
        },
      });

      await prisma.bookingService.createMany({
        data: selectedServices.map(service => ({
          bookingId: booking.id,
          serviceId: service.id,
          price: service.price,
          duration: service.duration,
          staffId: selectedStaff.id,
        })),
      });
    }
  }

  // 3. Future bookings (next 30 days)
  console.log('📅 Creating future bookings...');
  for (let i = 1; i <= 30; i++) {
    const numBookings = Math.floor(Math.random() * 6) + 2; // 2-7 bookings per day
    
    for (let j = 0; j < numBookings; j++) {
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const selectedStaff = staff[Math.floor(Math.random() * staff.length)];
      const selectedServices = getRandomItems(services, Math.floor(Math.random() * 3) + 1);
      const startHour = 9 + Math.floor(Math.random() * 10); // 9am-6pm
      const startTime = getBookingDateTime(i, startHour, Math.random() > 0.5 ? 0 : 30);
      const duration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      // Future bookings are mostly confirmed, some pending
      const status = Math.random() > 0.2 ? 'CONFIRMED' : 'PENDING';

      const booking = await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          providerId: selectedStaff.id,
          createdById: selectedStaff.id,
          bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalAmount: selectedServices.reduce((sum, s) => sum + s.price, 0),
          status,
          source: ['ONLINE', 'PHONE', 'WALK_IN'][Math.floor(Math.random() * 3)] as any,
          notes: i === 1 ? 'Tomorrow\'s appointment' : 
                 i <= 7 ? 'This week' : 
                 i <= 14 ? 'Next week' : 
                 'Later this month',
        },
      });

      await prisma.bookingService.createMany({
        data: selectedServices.map(service => ({
          bookingId: booking.id,
          serviceId: service.id,
          price: service.price,
          duration: service.duration,
          staffId: selectedStaff.id,
        })),
      });
    }
  }

  // 4. Create some recurring bookings (weekly appointments)
  console.log('📅 Creating recurring bookings...');
  const recurringCustomers = getRandomItems(allCustomers, 3);
  for (const customer of recurringCustomers) {
    const selectedStaff = staff[Math.floor(Math.random() * staff.length)];
    const selectedService = services[Math.floor(Math.random() * services.length)];
    
    // Create 4 weekly appointments
    for (let week = 0; week < 4; week++) {
      const startTime = getBookingDateTime(week * 7 + 3, 14, 0); // Same time each week
      const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);

      const booking = await prisma.booking.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          providerId: selectedStaff.id,
          createdById: selectedStaff.id,
          bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalAmount: selectedService.price,
          status: week === 0 ? 'CONFIRMED' : 'PENDING',
          source: 'PHONE',
          notes: `Weekly ${selectedService.name} - Week ${week + 1}`,
        },
      });

      await prisma.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: selectedService.id,
          price: selectedService.price,
          duration: selectedService.duration,
          staffId: selectedStaff.id,
        },
      });
    }
  }

  // 5. Create some group bookings (e.g., bridal party)
  console.log('📅 Creating group bookings...');
  const groupDate = getBookingDateTime(14, 10, 0); // 2 weeks from now
  const bridalPartyCustomers = getRandomItems(allCustomers, 4);
  
  for (let i = 0; i < bridalPartyCustomers.length; i++) {
    const customer = bridalPartyCustomers[i];
    const selectedStaff = staff[i % staff.length]; // Distribute among staff
    const bridalServices = services.filter(s => 
      s.name.includes('Facial') || s.name.includes('Manicure') || s.name.includes('Massage')
    );
    const selectedServices = getRandomItems(bridalServices, 2);
    
    const startTime = new Date(groupDate.getTime() + i * 30 * 60000); // Stagger by 30 mins
    const duration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const booking = await prisma.booking.create({
      data: {
        merchantId: merchant.id,
        locationId: location.id,
        customerId: customer.id,
        providerId: selectedStaff.id,
        createdById: selectedStaff.id,
        bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalAmount: selectedServices.reduce((sum, s) => sum + s.price, 0),
        status: 'CONFIRMED',
        source: 'PHONE',
        notes: `Bridal party - ${i === 0 ? 'Bride' : `Bridesmaid ${i}`}`,
      },
    });

    await prisma.bookingService.createMany({
      data: selectedServices.map(service => ({
        bookingId: booking.id,
        serviceId: service.id,
        price: service.price,
        duration: service.duration,
        staffId: selectedStaff.id,
      })),
    });
  }

  // 6. Add loyalty transactions for regular customers
  console.log('💰 Creating loyalty transactions...');
  const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
    where: { merchantId: merchant.id }
  });

  if (loyaltyProgram) {
    for (const customer of allCustomers.slice(0, 5)) { // First 5 customers get loyalty cards
      const existingCard = await prisma.loyaltyCard.findFirst({
        where: { customerId: customer.id }
      });

      if (!existingCard) {
        const card = await prisma.loyaltyCard.create({
          data: {
            programId: loyaltyProgram.id,
            customerId: customer.id,
            cardNumber: `HB-00${1236 + allCustomers.indexOf(customer)}`,
            points: Math.floor(Math.random() * 500),
            lifetimePoints: Math.floor(Math.random() * 2000) + 500,
          },
        });

        // Add some transaction history
        const currentBalance = card.points;
        await prisma.loyaltyTransaction.createMany({
          data: [
            {
              cardId: card.id,
              customerId: customer.id,
              merchantId: merchant.id,
              type: 'EARNED',
              points: 150,
              balance: currentBalance - 100 + 150, // This was before the redemption
              description: 'Points earned from service',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
            },
            {
              cardId: card.id,
              customerId: customer.id,
              merchantId: merchant.id,
              type: 'REDEEMED',
              points: -100,
              balance: currentBalance, // Current balance
              description: 'Redeemed for $10 discount',
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            },
          ],
        });
      }
    }
  }

  // 7. Create some refunds for cancelled bookings
  console.log('💸 Creating refunds...');
  const cancelledBookings = await prisma.booking.findMany({
    where: {
      merchantId: merchant.id,
      status: 'CANCELLED',
    },
    include: {
      invoice: {
        include: {
          payments: true,
        },
      },
    },
    take: 5,
  });

  for (const booking of cancelledBookings) {
    if (booking.invoice && booking.invoice.payments.length > 0) {
      const payment = booking.invoice.payments[0];
      const existingRefund = await prisma.paymentRefund.findFirst({
        where: { paymentId: payment.id }
      });
      
      if (!existingRefund) {
        await prisma.paymentRefund.create({
          data: {
            paymentId: payment.id,
            amount: payment.amount * 0.5, // 50% refund
            reason: 'Cancellation within policy period',
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        });
      }
    }
  }

  // Get final counts
  const bookingCount = await prisma.booking.count({ where: { merchantId: merchant.id } });
  const customerCount = await prisma.customer.count({ where: { merchantId: merchant.id } });
  const paymentCount = await prisma.payment.count({ where: { merchantId: merchant.id } });

  console.log('\n✅ Comprehensive seeding completed!');
  console.log('📊 Summary:');
  console.log(`   - Customers: ${customerCount}`);
  console.log(`   - Bookings: ${bookingCount}`);
  console.log(`   - Payments: ${paymentCount}`);
  console.log('\n🎉 Hamilton Beauty Spa now has comprehensive test data!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });