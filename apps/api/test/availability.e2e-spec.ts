import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestSeederService } from '../src/test/services/test-seeder.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Public Availability API (e2e)', () => {
  let app: INestApplication;
  let testData: any;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [TestSeederService],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configure app
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

    // Create test scenarios
    const scenarios = await seederService.createTestScenarios();
    testData = scenarios.availabilityMerchant;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/public/availability', () => {
    it('should return available slots for a staff member', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: testData.staff[0].id,
          serviceId: testData.services[0].id,
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: dayAfter.toISOString().split('T')[0],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        staffId: testData.staff[0].id,
        serviceId: testData.services[0].id,
        timezone: 'Australia/Sydney',
      });
      expect(response.body).toHaveProperty('availableSlots');
      expect(response.body.availableSlots).toBeInstanceOf(Array);
    });

    it('should validate date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: testData.staff[0].id,
          serviceId: testData.services[0].id,
          startDate: '2025-01-01',
          endDate: '2025-01-01', // Same date
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Start date must be before end date',
      });
    });

    it('should limit date range to prevent abuse', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: testData.staff[0].id,
          serviceId: testData.services[0].id,
          startDate: '2025-01-01',
          endDate: '2025-12-31', // Almost a year
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Date range cannot exceed 90 days',
      });
    });

    it('should handle non-existent staff', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: '00000000-0000-0000-0000-000000000000',
          serviceId: testData.services[0].id,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        })
        .expect(400);

      expect(response.body.message).toContain('Staff member not found');
    });

    it('should handle non-existent service', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: testData.staff[0].id,
          serviceId: '00000000-0000-0000-0000-000000000000',
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        })
        .expect(400);

      expect(response.body.message).toContain('Service not found');
    });

    it('should exclude booked time slots', async () => {
      // Create a booking for tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const booking = await prismaService.booking.create({
        data: {
          merchantId: testData.merchant.id,
          locationId: testData.location.id,
          customerId: testData.customers[0].id,
          providerId: testData.staff[0].id,
          bookingNumber: `TEST-${Date.now()}`,
          status: 'CONFIRMED',
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour later
          totalAmount: testData.services[0].price,
          depositAmount: 0,
          source: 'TEST',
          createdById: testData.staff[0].id,
        },
      });

      await prismaService.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: testData.services[0].id,
          staffId: testData.staff[0].id,
          price: testData.services[0].price,
          duration: testData.services[0].duration,
        },
      });

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: testData.staff[0].id,
          serviceId: testData.services[0].id,
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: dayAfter.toISOString().split('T')[0],
        })
        .expect(200);

      // The 10 AM slot should not be available
      const availableSlots = response.body.availableSlots;
      const tenAmSlot = availableSlots.find((slot: any) => {
        const slotTime = new Date(slot.startTime);
        return slotTime.getHours() === 10 && slotTime.getMinutes() === 0;
      });

      expect(tenAmSlot).toBeUndefined();
    });

    it('should respect service padding times', async () => {
      // Create a service with padding
      const paddedService = await prismaService.service.create({
        data: {
          merchantId: testData.merchant.id,
          categoryId: (await prismaService.serviceCategory.findFirst({
            where: { merchantId: testData.merchant.id }
          }))?.id || '',
          name: 'Padded Service',
          duration: 60,
          price: 150,
          paddingBefore: 15,
          paddingAfter: 15,
          isActive: true,
        },
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: testData.staff[0].id,
          serviceId: paddedService.id,
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: dayAfter.toISOString().split('T')[0],
        })
        .expect(200);

      expect(response.body.availableSlots).toBeInstanceOf(Array);
      
      // With padding, the effective duration is 90 minutes (15 + 60 + 15)
      // So slots should be spaced appropriately
      if (response.body.availableSlots.length >= 2) {
        const slot1Start = new Date(response.body.availableSlots[0].startTime);
        const slot2Start = new Date(response.body.availableSlots[1].startTime);
        const timeDiff = (slot2Start.getTime() - slot1Start.getTime()) / (1000 * 60); // in minutes
        
        // Time between slots should account for service duration but not padding
        expect(timeDiff).toBeLessThanOrEqual(60);
      }
    });
  });

  describe('Performance and Security', () => {
    it('should handle concurrent requests gracefully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const query = {
        staffId: testData.staff[0].id,
        serviceId: testData.services[0].id,
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: dayAfter.toISOString().split('T')[0],
      };

      // Make 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/public/availability')
          .query(query)
      );

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('availableSlots');
      });
    });

    it('should validate UUID formats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/public/availability')
        .query({
          staffId: 'not-a-uuid',
          serviceId: 'also-not-a-uuid',
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
    });
  });
});