import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestSeederService } from '../src/test/services/test-seeder.service';

// Ensure test environment is loaded
process.env.NODE_ENV = 'test';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.hpvnmqvdgkfeykekosrh:WV3R4JZIF2Htu92k@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

describe('Bookings v1 API (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let testMerchantId: string;
  let testStaffId: string;
  let testServiceId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [TestSeederService],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configure app similar to main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));

    app.setGlobalPrefix('api');
    
    // Enable versioning
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v',
      defaultVersion: '1',
    });

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    const seederService = moduleFixture.get<TestSeederService>(TestSeederService);

    // Seed test data
    const seedResult = await seederService.seed({
      cleanFirst: true,
      merchantCount: 1,
      includeDemoData: false,
    });

    const testMerchant = seedResult.merchants[0];
    testMerchantId = testMerchant.merchant.id;
    testStaffId = testMerchant.staff[0].id;
    testServiceId = testMerchant.services[0].id;
    testCustomerId = testMerchant.customers[0].id;

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/merchant/login')
      .send({
        username: testMerchant.merchant.username,
        password: testMerchant.merchant.password,
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/bookings', () => {
    it('should return empty bookings list initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta).toMatchObject({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .expect(401);
    });
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a booking successfully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const createBookingDto = {
        customerId: testCustomerId,
        providerId: testStaffId,
        locationId: (await prismaService.location.findFirst({ 
          where: { merchantId: testMerchantId } 
        }))?.id,
        services: [{
          serviceId: testServiceId,
          duration: 60,
          price: 100,
        }],
        startTime: tomorrow.toISOString(),
        totalAmount: 100,
        status: 'CONFIRMED',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(201);

      expect(response.body).toMatchObject({
        customerId: testCustomerId,
        providerId: testStaffId,
        status: 'CONFIRMED',
        totalAmount: '100',
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('bookingNumber');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          customerId: testCustomerId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /api/v1/bookings/create-with-check', () => {
    it('should prevent double booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const locationId = (await prismaService.location.findFirst({ 
        where: { merchantId: testMerchantId } 
      }))?.id;

      const bookingData = {
        customerId: testCustomerId,
        providerId: testStaffId,
        locationId,
        services: [{
          serviceId: testServiceId,
          duration: 60,
          price: 100,
        }],
        startTime: tomorrow.toISOString(),
        totalAmount: 100,
      };

      // Create first booking
      await request(app.getHttpServer())
        .post('/api/v1/bookings/create-with-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      // Try to create conflicting booking
      const conflictResponse = await request(app.getHttpServer())
        .post('/api/v1/bookings/create-with-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          customerId: testMerchant.customers[1].id, // Different customer
        })
        .expect(409);

      expect(conflictResponse.body).toMatchObject({
        message: 'This time slot has conflicts with existing bookings',
        requiresOverride: true,
      });
      expect(conflictResponse.body).toHaveProperty('conflicts');
    });

    it('should allow override for double booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(15, 0, 0, 0);

      const locationId = (await prismaService.location.findFirst({ 
        where: { merchantId: testMerchantId } 
      }))?.id;

      const bookingData = {
        customerId: testCustomerId,
        providerId: testStaffId,
        locationId,
        services: [{
          serviceId: testServiceId,
          duration: 60,
          price: 100,
        }],
        startTime: tomorrow.toISOString(),
        totalAmount: 100,
      };

      // Create first booking
      await request(app.getHttpServer())
        .post('/api/v1/bookings/create-with-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      // Create conflicting booking with override
      const overrideResponse = await request(app.getHttpServer())
        .post('/api/v1/bookings/create-with-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          customerId: testMerchant.customers[1].id,
          isOverride: true,
          overrideReason: 'Customer specifically requested this time',
        })
        .expect(201);

      expect(overrideResponse.body).toHaveProperty('isOverride', true);
      expect(overrideResponse.body).toHaveProperty('overrideReason');
    });
  });

  describe('GET /api/v1/bookings/available-slots', () => {
    it('should return available time slots', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings/available-slots')
        .query({
          staffId: testStaffId,
          serviceId: testServiceId,
          date: dateStr,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        staffId: testStaffId,
        serviceId: testServiceId,
        date: dateStr,
      });
      expect(response.body).toHaveProperty('slots');
      expect(response.body.slots).toBeInstanceOf(Array);
      
      // Should have available slots
      expect(response.body.slots.length).toBeGreaterThan(0);
      
      // Each slot should have the correct structure
      if (response.body.slots.length > 0) {
        expect(response.body.slots[0]).toHaveProperty('startTime');
        expect(response.body.slots[0]).toHaveProperty('endTime');
      }
    });
  });

  describe('PATCH /api/v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      // Create a booking to update
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(16, 0, 0, 0);

      const locationId = (await prismaService.location.findFirst({ 
        where: { merchantId: testMerchantId } 
      }))?.id;

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomerId,
          providerId: testStaffId,
          locationId,
          services: [{
            serviceId: testServiceId,
            duration: 60,
            price: 100,
          }],
          startTime: tomorrow.toISOString(),
          totalAmount: 100,
          status: 'CONFIRMED',
        });

      bookingId = response.body.id;
    });

    it('should update booking status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PROGRESS',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: bookingId,
        status: 'IN_PROGRESS',
      });
    });

    it('should handle booking cancellation', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CANCELLED',
          cancellationReason: 'Customer requested cancellation',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: bookingId,
        status: 'CANCELLED',
      });
      expect(response.body).toHaveProperty('cancelledAt');
    });
  });

  describe('API Versioning', () => {
    it('should accept v1 prefix explicitly', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should use v1 as default when no version specified', async () => {
      await request(app.getHttpServer())
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent versions', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

// Store reference to test merchant for cleanup
const testMerchant = {
  customers: [] as any[],
};