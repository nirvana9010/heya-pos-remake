import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function testDataCreation() {
  console.log('Testing data creation capabilities...\n');

  try {
    // 1. Test creating a customer
    console.log('1. Testing Customer creation...');
    const customer = await prisma.customer.create({
      data: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e', // Hamilton's merchant ID
        firstName: 'Test',
        lastName: 'Customer',
        email: `test.customer.${Date.now()}@example.com`,
        mobile: `041${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        loyaltyPoints: new Decimal(100.50),
        totalSpent: new Decimal(250.75),
        visitCount: 5,
      }
    });
    console.log('✅ Customer created:', customer.id);

    // 2. Test creating a service
    console.log('\n2. Testing Service creation...');
    const service = await prisma.service.create({
      data: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e',
        name: `Test Service ${Date.now()}`,
        description: 'A test service with decimal price',
        price: new Decimal(99.99),
        duration: 60,
        taxRate: new Decimal(0.10),
        isActive: true,
        requiresDeposit: false,
      }
    });
    console.log('✅ Service created:', service.id);

    // 3. Test creating a booking
    console.log('\n3. Testing Booking creation...');
    const booking = await prisma.booking.create({
      data: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e',
        locationId: 'f8f2d691-f4c6-4df3-ab69-25c9e24d2a7d', // Hamilton's location
        customerId: customer.id,
        bookingNumber: `TEST-${Date.now()}`,
        startTime: new Date('2025-06-10T10:00:00Z'),
        endTime: new Date('2025-06-10T11:00:00Z'),
        totalAmount: new Decimal(99.99),
        depositAmount: new Decimal(0),
        status: 'CONFIRMED',
        source: 'TEST',
        createdById: '6703e552-c600-4cfa-bcd5-14f75e3e0c5f', // Sarah Johnson
        providerId: '6703e552-c600-4cfa-bcd5-14f75e3e0c5f',
      }
    });
    console.log('✅ Booking created:', booking.id);

    // 4. Test creating an invoice with payment
    console.log('\n4. Testing Invoice and Payment creation...');
    const invoice = await prisma.invoice.create({
      data: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e',
        customerId: customer.id,
        bookingId: booking.id,
        invoiceNumber: `INV-TEST-${Date.now()}`,
        status: 'PAID',
        subtotal: new Decimal(90.90),
        taxAmount: new Decimal(9.09),
        discountAmount: new Decimal(0),
        totalAmount: new Decimal(99.99),
        paidAmount: new Decimal(99.99),
        dueDate: new Date(),
        createdById: '6703e552-c600-4cfa-bcd5-14f75e3e0c5f',
      }
    });
    console.log('✅ Invoice created:', invoice.id);

    const payment = await prisma.payment.create({
      data: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e',
        locationId: 'f8f2d691-f4c6-4df3-ab69-25c9e24d2a7d',
        invoiceId: invoice.id,
        paymentMethod: 'CARD',
        amount: new Decimal(99.99),
        status: 'COMPLETED',
        processedAt: new Date(),
      }
    });
    console.log('✅ Payment created:', payment.id);

    // 5. Test querying with decimal fields
    console.log('\n5. Testing queries with decimal fields...');
    const richCustomers = await prisma.customer.findMany({
      where: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e',
        totalSpent: {
          gte: new Decimal(100)
        }
      }
    });
    console.log(`✅ Found ${richCustomers.length} customers with totalSpent >= 100`);

    // 6. Test aggregation
    console.log('\n6. Testing aggregation functions...');
    const stats = await prisma.payment.aggregate({
      where: {
        merchantId: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      },
      _avg: {
        amount: true
      },
      _count: true
    });
    console.log('✅ Payment stats:', {
      count: stats._count,
      sum: stats._sum.amount?.toString(),
      avg: stats._avg.amount?.toString()
    });

    // 7. Test JSON field operations
    console.log('\n7. Testing JSON field operations...');
    const merchant = await prisma.merchant.findFirst({
      where: { id: 'f60a8fa7-a5bd-4b58-a29c-3852ddfff15e' }
    });
    console.log('✅ Merchant settings:', merchant?.settings);

    console.log('\n✅ All tests passed! Data creation is working correctly.');

    // Cleanup
    console.log('\nCleaning up test data...');
    await prisma.payment.delete({ where: { id: payment.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
    await prisma.service.delete({ where: { id: service.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDataCreation();