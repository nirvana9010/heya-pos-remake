import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { addDays, addHours, setHours, setMinutes } from 'date-fns';

export interface TestDataOptions {
  merchantName?: string;
  username?: string;
  password?: string;
  staffCount?: number;
  serviceCount?: number;
  customerCount?: number;
  bookingCount?: number;
  cleanupAfter?: boolean;
}

export interface TestDataKit {
  merchant: {
    id: string;
    name: string;
    username: string;
    password: string;
  };
  location: {
    id: string;
    name: string;
  };
  staff: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    pin: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  customers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  }>;
  cleanup: () => Promise<void>;
}

@Injectable()
export class TestDataFactory {
  private createdMerchantIds: string[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a complete test data kit with merchant, location, staff, services, and customers
   */
  async create(options: TestDataOptions = {}): Promise<TestDataKit> {
    const {
      merchantName = faker.company.name(),
      username = faker.internet.userName().toUpperCase(),
      password = 'test123',
      staffCount = 2,
      serviceCount = 3,
      customerCount = 5,
      bookingCount = 0,
      cleanupAfter = true,
    } = options;

    // Ensure we have a default package
    let defaultPackage = await this.prisma.package.findFirst({
      where: { name: 'Test Package' }
    });
    
    if (!defaultPackage) {
      defaultPackage = await this.prisma.package.create({
        data: {
          name: 'Test Package',
          monthlyPrice: 99,
          trialDays: 30,
          maxLocations: 5,
          maxStaff: 50,
          maxCustomers: 1000,
          features: {
            bookings: true,
            payments: true,
            loyalty: true,
          },
        },
      });
    }

    // Create merchant
    const merchant = await this.prisma.merchant.create({
      data: {
        name: merchantName,
        email: faker.internet.email(),
        subdomain: merchantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        packageId: defaultPackage.id,
        subscriptionStatus: 'ACTIVE',
        settings: {
          timezone: 'Australia/Sydney',
          currency: 'AUD',
          taxRate: 10,
          bookingRules: {
            allowOnlineBooking: true,
            requireDeposit: false,
            cancellationHours: 24,
            maxAdvanceBookingDays: 90,
          },
        },
      },
    });

    // Create merchant auth
    await this.prisma.merchantAuth.create({
      data: {
        merchantId: merchant.id,
        username,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    this.createdMerchantIds.push(merchant.id);

    // Create location
    const location = await this.prisma.location.create({
      data: {
        merchant: { connect: { id: merchant.id } },
        name: 'Test Location',
        address: faker.location.streetAddress(),
        suburb: faker.location.city(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        postalCode: faker.location.zipCode(),
        country: 'Australia',
        phone: faker.phone.number(),
        email: faker.internet.email(),
        timezone: 'Australia/Sydney',
        isActive: true,
        businessHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '20:00' },
          friday: { open: '09:00', close: '20:00' },
          saturday: { open: '09:00', close: '17:00' },
          sunday: { open: '10:00', close: '16:00' },
        },
        settings: {
          bookingInterval: 15,
          bufferTime: 0,
        },
      },
    });

    // Create service category
    const category = await this.prisma.serviceCategory.create({
      data: {
        merchantId: merchant.id,
        name: 'Test Services',
        description: 'Test service category',
        color: '#FF6B6B',
        sortOrder: 1,
        isActive: true,
      },
    });

    // Create services
    const services = await Promise.all(
      Array.from({ length: serviceCount }, async (_, i) => {
        return this.prisma.service.create({
          data: {
            merchantId: merchant.id,
            categoryId: category.id,
            name: `Test Service ${i + 1}`,
            description: faker.lorem.sentence(),
            duration: faker.helpers.arrayElement([30, 45, 60, 90, 120]),
            paddingBefore: faker.helpers.arrayElement([0, 5, 10, 15]),
            paddingAfter: faker.helpers.arrayElement([0, 5, 10, 15]),
            price: faker.number.int({ min: 20, max: 200 }),
            isActive: true,
          },
        });
      })
    );

    // Create staff
    const staff = await Promise.all(
      Array.from({ length: staffCount }, async (_, i) => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const pin = faker.string.numeric(4);
        
        const staffMember = await this.prisma.staff.create({
          data: {
            merchantId: merchant.id,
            email: faker.internet.email({ firstName, lastName }),
            firstName,
            lastName,
            phone: faker.phone.number(),
            pin: pin,
            accessLevel: i === 0 ? 3 : 1, // Higher level for first staff member
            commissionRate: 30,
            status: 'ACTIVE',
            calendarColor: faker.color.rgb(),
          },
        });

        // Assign to location
        await this.prisma.staffLocation.create({
          data: {
            staffId: staffMember.id,
            locationId: location.id,
            isPrimary: true,
          },
        });

        // Assign services to staff (if not manager who can do all)
        if (i !== 0) {
          const staffServices = faker.helpers.arrayElements(services, { min: 1, max: services.length });
          // Note: staffService relation doesn't exist in the schema
          // You might need to create a custom relation or remove this
        }

        return {
          id: staffMember.id,
          email: staffMember.email,
          firstName,
          lastName,
          pin,
        };
      })
    );

    // Create customers
    const customers = await Promise.all(
      Array.from({ length: customerCount }, async () => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        
        return this.prisma.customer.create({
          data: {
            merchantId: merchant.id,
            email: faker.internet.email({ firstName, lastName }),
            firstName,
            lastName,
            phone: faker.phone.number(),
            dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            source: faker.helpers.arrayElement(['WALK_IN', 'ONLINE', 'PHONE']),
            marketingConsent: faker.datatype.boolean(),
          },
        });
      })
    );

    // Cleanup function
    const cleanup = async () => {
      if (cleanupAfter) {
        await this.cleanupMerchant(merchant.id);
      }
    };

    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        username,
        password,
      },
      location: {
        id: location.id,
        name: location.name,
      },
      staff,
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: parseFloat(s.price.toString()),
      })),
      customers: customers.map(c => ({
        id: c.id,
        email: c.email,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        phone: c.phone || '',
      })),
      cleanup,
    };
  }

  /**
   * Cleans up all data for a merchant
   */
  async cleanupMerchant(merchantId: string) {
    // Delete in correct order to respect foreign keys
    await this.prisma.$transaction([
      // Delete bookings and related data
      this.prisma.bookingService.deleteMany({ 
        where: { booking: { merchantId } } 
      }),
      this.prisma.booking.deleteMany({ where: { merchantId } }),
      
      // Delete orders and payments
      this.prisma.orderPayment.deleteMany({ 
        where: { order: { merchantId } } 
      }),
      this.prisma.orderItem.deleteMany({ 
        where: { order: { merchantId } } 
      }),
      this.prisma.orderModifier.deleteMany({ 
        where: { order: { merchantId } } 
      }),
      this.prisma.tipAllocation.deleteMany({ 
        where: { orderPayment: { order: { merchantId } } } 
      }),
      this.prisma.order.deleteMany({ where: { merchantId } }),
      
      // Delete staff and services
      this.prisma.staffLocation.deleteMany({ 
        where: { staff: { merchantId } } 
      }),
      this.prisma.staff.deleteMany({ where: { merchantId } }),
      this.prisma.service.deleteMany({ where: { merchantId } }),
      this.prisma.serviceCategory.deleteMany({ where: { merchantId } }),
      
      // Delete customers
      this.prisma.customer.deleteMany({ where: { merchantId } }),
      
      // Delete location
      this.prisma.location.deleteMany({ where: { merchantId } }),
      
      // Delete loyalty data
      this.prisma.loyaltyTransaction.deleteMany({ 
        where: { customer: { merchantId } } 
      }),
      this.prisma.loyaltyCard.deleteMany({ 
        where: { program: { merchantId } } 
      }),
      this.prisma.loyaltyProgram.deleteMany({ where: { merchantId } }),
      
      // Delete payments and refunds
      this.prisma.paymentRefund.deleteMany({ 
        where: { payment: { invoice: { merchantId } } } 
      }),
      this.prisma.payment.deleteMany({ 
        where: { invoice: { merchantId } } 
      }),
      
      // Delete invoices
      this.prisma.invoiceItem.deleteMany({ 
        where: { invoice: { merchantId } } 
      }),
      this.prisma.invoice.deleteMany({ where: { merchantId } }),
      
      // Delete merchant auth and merchant
      this.prisma.merchantAuth.deleteMany({ where: { merchantId } }),
      this.prisma.merchant.delete({ where: { id: merchantId } }),
    ]);
  }

  /**
   * Cleans up all test data created by this factory instance
   */
  async cleanupAll() {
    for (const merchantId of this.createdMerchantIds) {
      await this.cleanupMerchant(merchantId);
    }
    this.createdMerchantIds = [];
  }

  /**
   * Create bookings for testing
   */
  async createBookings(options: {
    merchantId: string;
    locationId: string;
    staffIds: string[];
    serviceIds: string[];
    customerIds: string[];
    count?: number;
  }) {
    const { merchantId, locationId, staffIds, serviceIds, customerIds, count = 5 } = options;
    
    const bookings = [];
    
    for (let i = 0; i < count; i++) {
      const customer = faker.helpers.arrayElement(customerIds);
      const service = await this.prisma.service.findUnique({
        where: { id: faker.helpers.arrayElement(serviceIds) },
      });
      
      if (!service) continue;
      
      const staff = faker.helpers.arrayElement(staffIds);
      
      // Generate booking time
      const isPast = i < count / 2;
      const baseDate = isPast 
        ? faker.date.recent({ days: 30 })
        : faker.date.soon({ days: 30 });
      
      const startTime = setMinutes(
        setHours(baseDate, faker.number.int({ min: 9, max: 17 })),
        faker.helpers.arrayElement([0, 15, 30, 45])
      );
      
      const endTime = addHours(startTime, service.duration / 60);
      
      const booking = await this.prisma.booking.create({
        data: {
          merchantId,
          locationId,
          customerId: customer,
          providerId: staff,
          bookingNumber: `BK${Date.now()}${faker.string.alphanumeric(5).toUpperCase()}`,
          status: isPast 
            ? faker.helpers.arrayElement(['COMPLETED', 'CANCELLED', 'NO_SHOW'])
            : 'CONFIRMED',
          startTime,
          endTime,
          totalAmount: service.price,
          depositAmount: 0,
          source: faker.helpers.arrayElement(['ONLINE', 'PHONE', 'WALK_IN']),
          createdById: staff, // Should be a staff ID, not merchant ID
        },
      });
      
      await this.prisma.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: service.id,
          staffId: staff,
          price: service.price,
          duration: service.duration,
        },
      });
      
      bookings.push(booking);
    }
    
    return bookings;
  }
}