import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TestDataFactory } from '../factories/test-data.factory';
import { ConfigService } from '@nestjs/config';

export interface TestSeedOptions {
  cleanFirst?: boolean;
  merchantCount?: number;
  includeDemoData?: boolean;
}

@Injectable()
export class TestSeederService {
  private testDataFactory: TestDataFactory;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.testDataFactory = new TestDataFactory(prisma);
  }

  /**
   * Seeds the test database with comprehensive test data
   */
  async seed(options: TestSeedOptions = {}) {
    const {
      cleanFirst = true,
      merchantCount = 1,
      includeDemoData = true,
    } = options;

    console.log('🌱 Starting test database seeding...');

    try {
      // Clean database if requested
      if (cleanFirst) {
        await this.cleanDatabase();
      }

      // Create default package if it doesn't exist
      await this.ensureDefaultPackage();

      // Create test merchants
      const merchants = [];
      for (let i = 0; i < merchantCount; i++) {
        const merchantName = i === 0 
          ? 'Test Merchant' 
          : `Test Merchant ${i + 1}`;
        
        const username = i === 0
          ? this.configService.get('TEST_MERCHANT_USERNAME', 'TEST_MERCHANT')
          : `TEST_MERCHANT_${i + 1}`;

        const merchant = await this.testDataFactory.create({
          merchantName,
          username,
          password: this.configService.get('TEST_MERCHANT_PASSWORD', 'test123'),
          staffCount: 3,
          serviceCount: 5,
          customerCount: 10,
          bookingCount: includeDemoData ? 10 : 0,
          cleanupAfter: false,
        });

        merchants.push(merchant);
        console.log(`✅ Created merchant: ${merchantName} (username: ${username})`);
      }

      // Create demo booking data if requested
      if (includeDemoData && merchants.length > 0) {
        const primaryMerchant = merchants[0];
        
        // Create some bookings for today and upcoming days
        await this.testDataFactory.createBookings({
          merchantId: primaryMerchant.merchant.id,
          locationId: primaryMerchant.location.id,
          staffIds: primaryMerchant.staff.map(s => s.id),
          serviceIds: primaryMerchant.services.map(s => s.id),
          customerIds: primaryMerchant.customers.map(c => c.id),
          count: 10,
        });

        console.log('✅ Created demo bookings');
      }

      console.log('🎉 Test database seeding completed successfully!');
      
      return {
        merchants,
        summary: {
          merchantsCreated: merchants.length,
          totalStaff: merchants.reduce((sum, m) => sum + m.staff.length, 0),
          totalServices: merchants.reduce((sum, m) => sum + m.services.length, 0),
          totalCustomers: merchants.reduce((sum, m) => sum + m.customers.length, 0),
        },
      };
    } catch (error) {
      console.error('❌ Error seeding test database:', error);
      throw error;
    }
  }

  /**
   * Cleans the entire test database
   */
  async cleanDatabase() {
    console.log('🧹 Cleaning test database...');

    const tables = [
      'TipAllocation',
      'OrderPayment',
      'OrderItem',
      'OrderModifier',
      'Order',
      'PaymentSplit',
      'Payment',
      'BookingService',
      'Booking',
      'LoyaltyTransaction',
      'LoyaltyMember',
      'LoyaltyProgram',
      'StaffService',
      'StaffLocation',
      'Staff',
      'Customer',
      'Service',
      'ServiceCategory',
      'Location',
      'MerchantSettings',
      'MerchantAuth',
      'Merchant',
      'Package',
    ];

    // Disable foreign key checks for cleanup
    await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

    try {
      for (const table of tables) {
        try {
          await this.prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
          console.log(`  ✓ Cleaned table: ${table}`);
        } catch (error) {
          // Table might not exist, ignore
        }
      }
    } finally {
      // Re-enable foreign key checks
      await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    }

    console.log('✅ Database cleaned');
  }

  /**
   * Ensures a default package exists for merchants
   */
  private async ensureDefaultPackage() {
    const existingPackage = await this.prisma.package.findFirst({
      where: { name: 'Test Package' },
    });

    if (!existingPackage) {
      await this.prisma.package.create({
        data: {
          name: 'Test Package',
          monthlyPrice: 0,
          trialDays: 30,
          maxLocations: 10,
          maxStaff: 100,
          maxCustomers: 1000,
          features: {
            bookings: true,
            payments: true,
            loyalty: true,
            inventory: true,
            reports: true,
          },
        },
      });
    }
  }

  /**
   * Creates specific test scenarios for integration testing
   */
  async createTestScenarios() {
    console.log('🎬 Creating test scenarios...');

    // Scenario 1: Double booking test
    const doubleBookingMerchant = await this.testDataFactory.create({
      merchantName: 'Double Booking Test Merchant',
      username: 'DOUBLE_BOOKING_TEST',
      password: 'test123',
      staffCount: 1,
      serviceCount: 1,
      customerCount: 2,
      bookingCount: 0,
      cleanupAfter: false,
    });

    // Create a booking for testing double booking prevention
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await this.testDataFactory.createBookings({
      merchantId: doubleBookingMerchant.merchant.id,
      locationId: doubleBookingMerchant.location.id,
      staffIds: [doubleBookingMerchant.staff[0].id],
      serviceIds: [doubleBookingMerchant.services[0].id],
      customerIds: [doubleBookingMerchant.customers[0].id],
      count: 1,
    });

    console.log('✅ Created double booking test scenario');

    // Scenario 2: Availability test
    const availabilityMerchant = await this.testDataFactory.create({
      merchantName: 'Availability Test Merchant',
      username: 'AVAILABILITY_TEST',
      password: 'test123',
      staffCount: 2,
      serviceCount: 3,
      customerCount: 5,
      bookingCount: 5,
      cleanupAfter: false,
    });

    console.log('✅ Created availability test scenario');

    return {
      doubleBookingMerchant,
      availabilityMerchant,
    };
  }
}