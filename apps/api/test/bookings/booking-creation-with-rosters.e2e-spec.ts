import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';

describe('Booking Creation with Staff Rosters (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let merchantId: string;
  let staffId: string;
  let customerId: string;
  let serviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    
    // Clean up test data
    await cleanupTestData();
    
    // Create test data
    await setupTestData();
    
    // Generate auth token
    authToken = jwtService.sign({
      sub: 'test-user',
      merchantId,
      email: 'test@example.com',
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  const cleanupTestData = async () => {
    // Delete in order to respect foreign key constraints
    await prisma.booking.deleteMany({ where: { merchantId: { startsWith: 'test-' } } });
    await prisma.staffSchedule.deleteMany({ where: { staffId: { startsWith: 'test-' } } });
    await prisma.service.deleteMany({ where: { merchantId: { startsWith: 'test-' } } });
    await prisma.staff.deleteMany({ where: { merchantId: { startsWith: 'test-' } } });
    await prisma.customer.deleteMany({ where: { merchantId: { startsWith: 'test-' } } });
    await prisma.merchant.deleteMany({ where: { id: { startsWith: 'test-' } } });
  };

  const setupTestData = async () => {
    merchantId = `test-${uuidv4()}`;
    staffId = `test-${uuidv4()}`;
    customerId = `test-${uuidv4()}`;
    serviceId = `test-${uuidv4()}`;

    // Create merchant with business hours
    await prisma.merchant.create({
      data: {
        id: merchantId,
        name: 'Test Merchant',
        slug: `test-${uuidv4()}`,
        settings: {
          businessHours: {
            monday: { open: '09:00', close: '18:00', isOpen: true },
            tuesday: { open: '09:00', close: '18:00', isOpen: true },
            wednesday: { open: '09:00', close: '18:00', isOpen: true },
            thursday: { open: '09:00', close: '18:00', isOpen: true },
            friday: { open: '09:00', close: '18:00', isOpen: true },
            saturday: { open: '10:00', close: '16:00', isOpen: true },
            sunday: { open: '10:00', close: '16:00', isOpen: false },
          },
        },
      },
    });

    // Create staff member
    await prisma.staff.create({
      data: {
        id: staffId,
        merchantId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        color: '#000000',
        status: 'ACTIVE',
      },
    });

    // Create customer
    await prisma.customer.create({
      data: {
        id: customerId,
        merchantId,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '0987654321',
      },
    });

    // Create service
    await prisma.service.create({
      data: {
        id: serviceId,
        merchantId,
        name: 'Test Service',
        duration: 60,
        price: 100,
        isActive: true,
      },
    });
  };

  // Helper to create a date with specific time on next Monday
  const createDateTime = (hours: number, minutes: number = 0): Date => {
    const date = new Date();
    const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  describe('POST /api/v1/bookings', () => {
    beforeEach(async () => {
      // Clear any existing schedules
      await prisma.staffSchedule.deleteMany({ where: { staffId } });
    });

    it('should create booking when within staff schedule', async () => {
      // Create staff schedule for Monday 10:00-16:00
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '16:00',
        },
      });

      const startTime = createDateTime(11, 0); // 11:00 AM Monday

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId,
          startTime: startTime.toISOString(),
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('bookingNumber');
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should reject booking outside staff schedule', async () => {
      // Create staff schedule for Monday 10:00-16:00
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '16:00',
        },
      });

      const startTime = createDateTime(9, 0); // 9:00 AM Monday (too early)

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId,
          startTime: startTime.toISOString(),
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.message).toContain('only available from 10:00 to 16:00');
    });

    it('should reject booking on day without staff schedule', async () => {
      // No schedule created for Monday
      const startTime = createDateTime(11, 0); // 11:00 AM Monday

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId,
          startTime: startTime.toISOString(),
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.message).toContain('not available on monday');
    });

    it('should reject booking that extends beyond staff schedule', async () => {
      // Create staff schedule for Monday 10:00-16:00
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '16:00',
        },
      });

      // Create a 2-hour service
      const longServiceId = `test-${uuidv4()}`;
      await prisma.service.create({
        data: {
          id: longServiceId,
          merchantId,
          name: 'Long Service',
          duration: 120, // 2 hours
          price: 200,
          isActive: true,
        },
      });

      const startTime = createDateTime(15, 0); // 3:00 PM Monday (would end at 5:00 PM)

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId: longServiceId,
          startTime: startTime.toISOString(),
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.message).toContain('only available from 10:00 to 16:00');
    });

    it('should allow merchant override to book outside staff schedule', async () => {
      // Create staff schedule for Monday 10:00-16:00
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '16:00',
        },
      });

      const startTime = createDateTime(9, 0); // 9:00 AM Monday (outside schedule)

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId,
          startTime: startTime.toISOString(),
          source: 'MERCHANT_APP',
          isOverride: true,
          overrideReason: 'Customer requested early appointment',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.isOverride).toBe(true);
      expect(response.body.overrideReason).toBe('Customer requested early appointment');
    });

    it('should reject booking outside business hours even within staff schedule', async () => {
      // Staff available beyond business hours
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '20:00',
        },
      });

      const startTime = createDateTime(19, 0); // 7:00 PM Monday (after business hours)

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId,
          startTime: startTime.toISOString(),
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.message).toContain('within business hours');
    });

    it('should reject booking on closed business day', async () => {
      // Try to book on Sunday (closed)
      const sunday = new Date();
      const daysUntilSunday = (7 - sunday.getDay()) % 7 || 7;
      sunday.setDate(sunday.getDate() + daysUntilSunday);
      sunday.setHours(11, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          staffId,
          customerId,
          serviceId,
          startTime: sunday.toISOString(),
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.message).toContain('closed on this day');
    });

    it('should handle multi-service bookings with different staff schedules', async () => {
      // Create second staff member
      const staff2Id = `test-${uuidv4()}`;
      await prisma.staff.create({
        data: {
          id: staff2Id,
          merchantId,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '1234567891',
          color: '#FF0000',
          status: 'ACTIVE',
        },
      });

      // Create second service
      const service2Id = `test-${uuidv4()}`;
      await prisma.service.create({
        data: {
          id: service2Id,
          merchantId,
          name: 'Test Service 2',
          duration: 60,
          price: 150,
          isActive: true,
        },
      });

      // Create schedules for both staff
      await prisma.staffSchedule.createMany({
        data: [
          {
            id: uuidv4(),
            staffId,
            dayOfWeek: 1,
            startTime: '10:00',
            endTime: '16:00',
          },
          {
            id: uuidv4(),
            staffId: staff2Id,
            dayOfWeek: 1,
            startTime: '12:00',
            endTime: '18:00',
          },
        ],
      });

      const startTime = createDateTime(12, 0); // 12:00 PM Monday

      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          startTime: startTime.toISOString(),
          services: [
            { serviceId, staffId },
            { serviceId: service2Id, staffId: staff2Id },
          ],
          source: 'MERCHANT_APP',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.services).toHaveLength(2);
    });
  });

  describe('GET /api/v1/bookings/availability', () => {
    beforeEach(async () => {
      // Clear any existing schedules
      await prisma.staffSchedule.deleteMany({ where: { staffId } });
    });

    it('should return available slots only within staff schedule', async () => {
      // Create staff schedule for Monday 10:00-15:00
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '15:00',
        },
      });

      const monday = createDateTime(0, 0);
      
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          date: monday.toISOString().split('T')[0],
          serviceId,
          staffId,
        });

      expect(response.status).toBe(200);
      expect(response.body.availableSlots).toBeDefined();
      
      // All slots should be between 10:00 and 15:00
      response.body.availableSlots.forEach((slot: any) => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        expect(slotHour).toBeGreaterThanOrEqual(10);
        expect(slotHour).toBeLessThan(15);
      });
    });

    it('should return no slots when staff has no schedule for the day', async () => {
      // No schedule for Monday
      const monday = createDateTime(0, 0);
      
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          date: monday.toISOString().split('T')[0],
          serviceId,
          staffId,
        });

      expect(response.status).toBe(200);
      expect(response.body.availableSlots).toHaveLength(0);
    });

    it('should exclude slots with existing bookings', async () => {
      // Create staff schedule
      await prisma.staffSchedule.create({
        data: {
          id: uuidv4(),
          staffId,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '16:00',
        },
      });

      // Create an existing booking at 11:00
      const bookingTime = createDateTime(11, 0);
      await prisma.booking.create({
        data: {
          id: uuidv4(),
          bookingNumber: 'BK123',
          merchantId,
          customerId,
          staffId,
          serviceId,
          startTime: bookingTime,
          endTime: new Date(bookingTime.getTime() + 60 * 60 * 1000),
          status: 'CONFIRMED',
          totalAmount: 100,
          depositAmount: 0,
          source: 'MERCHANT_APP',
          createdById: 'test-user',
        },
      });

      const monday = createDateTime(0, 0);
      
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          date: monday.toISOString().split('T')[0],
          serviceId,
          staffId,
        });

      expect(response.status).toBe(200);
      
      // Should not have a slot at 11:00
      const elevenAmSlot = response.body.availableSlots.find((s: any) => s.time === '11:00');
      expect(elevenAmSlot).toBeUndefined();
    });
  });
});