import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';

export class E2ETestSetup {
  app: INestApplication;
  prisma: PrismaService;
  authToken: string;
  merchantId: string;
  staffId: string;

  async init() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await this.app.init();

    this.prisma = this.app.get<PrismaService>(PrismaService);
    
    // Clean database
    await this.cleanDatabase();
    
    // Setup test data
    await this.setupTestData();
    
    return this;
  }

  async cleanDatabase() {
    // Delete in correct order to respect foreign keys
    await this.prisma.bookingService.deleteMany();
    await this.prisma.booking.deleteMany();
    await this.prisma.invoice.deleteMany();
    await this.prisma.customer.deleteMany();
    await this.prisma.service.deleteMany();
    await this.prisma.serviceCategory.deleteMany();
    await this.prisma.staffLocation.deleteMany();
    await this.prisma.staff.deleteMany();
    await this.prisma.location.deleteMany();
    await this.prisma.merchantAuth.deleteMany();
    await this.prisma.merchant.deleteMany();
  }

  async setupTestData() {
    // Create test merchant
    const merchant = await this.prisma.merchant.create({
      data: {
        businessName: 'Hamilton Beauty Test',
        contactEmail: 'test@hamiltonbeauty.com',
        contactPhone: '+1234567890',
        address: '123 Test Street',
        city: 'Hamilton',
        state: 'ON',
        country: 'Canada',
        postalCode: 'L8P 4S6',
        timezone: 'America/Toronto',
        currency: 'CAD',
        status: 'ACTIVE',
      },
    });
    this.merchantId = merchant.id;

    // Create merchant auth
    await this.prisma.merchantAuth.create({
      data: {
        merchantId: merchant.id,
        username: 'hamilton_test',
        password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // secret
      },
    });

    // Create test location
    const location = await this.prisma.location.create({
      data: {
        merchantId: merchant.id,
        name: 'Main Branch',
        address: '123 Test Street',
        city: 'Hamilton',
        state: 'ON',
        country: 'Canada',
        postalCode: 'L8P 4S6',
        phone: '+1234567890',
        email: 'main@hamiltonbeauty.com',
        isActive: true,
      },
    });

    // Create test staff
    const staff = await this.prisma.staff.create({
      data: {
        merchantId: merchant.id,
        email: 'staff@hamiltonbeauty.com',
        firstName: 'Test',
        lastName: 'Staff',
        pin: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // 1234
        accessLevel: 2,
        status: 'ACTIVE',
        hireDate: new Date(),
      },
    });
    this.staffId = staff.id;

    // Link staff to location
    await this.prisma.staffLocation.create({
      data: {
        staffId: staff.id,
        locationId: location.id,
        isPrimary: true,
      },
    });
  }

  async login(): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/api/auth/merchant-login')
      .send({
        username: 'hamilton_test',
        password: 'secret',
      });

    this.authToken = response.body.accessToken;
    return this.authToken;
  }

  async loadHamiltonBeautyServices() {
    // Load CSV data
    const csvPath = join(__dirname, '../../../test-data/hamilton-beauty-services.csv');
    const csvContent = readFileSync(csvPath);

    // Import services
    const response = await request(this.app.getHttpServer())
      .post('/api/services/import/csv')
      .set('Authorization', `Bearer ${this.authToken}`)
      .attach('file', csvContent, 'hamilton-beauty-services.csv');

    return response.body;
  }

  async createTestCustomers() {
    const customers = [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        mobile: '+14165551001',
        dateOfBirth: '1985-06-15',
        gender: 'FEMALE',
        address: '123 Queen St',
        city: 'Hamilton',
        state: 'ON',
        country: 'Canada',
        postalCode: 'L8P 1A1',
        marketingConsent: true,
      },
      {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@email.com',
        mobile: '+14165551002',
        dateOfBirth: '1990-03-22',
        gender: 'MALE',
        address: '456 King St',
        city: 'Hamilton',
        state: 'ON',
        country: 'Canada',
        postalCode: 'L8P 2B2',
        marketingConsent: true,
      },
      {
        firstName: 'Emma',
        lastName: 'Wilson',
        email: 'emma.wilson@email.com',
        mobile: '+14165551003',
        dateOfBirth: '1992-11-08',
        gender: 'FEMALE',
        address: '789 Main St',
        city: 'Hamilton',
        state: 'ON',
        country: 'Canada',
        postalCode: 'L8P 3C3',
        marketingConsent: false,
      },
    ];

    const createdCustomers = [];
    for (const customer of customers) {
      const response = await request(this.app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${this.authToken}`)
        .send(customer);
      
      createdCustomers.push(response.body);
    }

    return createdCustomers;
  }

  async close() {
    await this.app.close();
  }
}

// Helper function to create test app
export async function createTestApp() {
  const setup = new E2ETestSetup();
  await setup.init();
  return setup;
}