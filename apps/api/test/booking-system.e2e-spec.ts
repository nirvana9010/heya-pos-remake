import * as request from 'supertest';
import { E2ETestSetup } from './e2e-setup';
import { format, addDays } from 'date-fns';

describe('Booking System E2E Tests', () => {
  let setup: E2ETestSetup;
  let authToken: string;
  let services: any[] = [];
  let customers: any[] = [];
  let bookings: any[] = [];

  beforeAll(async () => {
    setup = new E2ETestSetup();
    await setup.init();
    authToken = await setup.login();
  }, 30000);

  afterAll(async () => {
    await setup.close();
  });

  describe('1. Database Connection', () => {
    it('should connect to database and retrieve merchant', async () => {
      const merchant = await setup.prisma.merchant.findUnique({
        where: { id: setup.merchantId },
      });

      expect(merchant).toBeDefined();
      expect(merchant.businessName).toBe('Hamilton Beauty Test');
    });

    it('should have proper relations set up', async () => {
      const merchant = await setup.prisma.merchant.findUnique({
        where: { id: setup.merchantId },
        include: {
          locations: true,
          staff: true,
          auth: true,
        },
      });

      expect(merchant.locations).toHaveLength(1);
      expect(merchant.staff).toHaveLength(1);
      expect(merchant.auth).toBeDefined();
    });
  });

  describe('2. Authentication System', () => {
    it('should authenticate merchant successfully', async () => {
      const response = await request(setup.app.getHttpServer())
        .post('/api/auth/merchant-login')
        .send({
          username: 'hamilton_test',
          password: 'secret',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.merchant.businessName).toBe('Hamilton Beauty Test');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(setup.app.getHttpServer())
        .post('/api/auth/merchant-login')
        .send({
          username: 'hamilton_test',
          password: 'wrong_password',
        });

      expect(response.status).toBe(401);
    });

    it('should verify JWT token', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('merchant');
    });
  });

  describe('3. Service Catalog Management', () => {
    it('should import Hamilton Beauty services from CSV', async () => {
      const importResult = await setup.loadHamiltonBeautyServices();

      expect(importResult.imported).toBeGreaterThan(0);
      expect(importResult.errors).toHaveLength(0);
      
      console.log(`Imported ${importResult.imported} services`);
    });

    it('should retrieve all imported services', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      
      services = response.body.data;
      console.log(`Retrieved ${services.length} services`);
    });

    it('should have proper service categories', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/services/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      
      const categoryNames = response.body.map((c: any) => c.name);
      expect(categoryNames).toContain('Hair');
      expect(categoryNames).toContain('Nails');
      expect(categoryNames).toContain('Skincare');
      expect(categoryNames).toContain('Massage');
    });

    it('should search services by name', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/services?search=manicure')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name.toLowerCase()).toContain('manicure');
    });

    it('should filter services by category', async () => {
      // Get Hair category
      const categoriesResponse = await request(setup.app.getHttpServer())
        .get('/api/services/categories')
        .set('Authorization', `Bearer ${authToken}`);
      
      const hairCategory = categoriesResponse.body.find((c: any) => c.name === 'Hair');
      
      const response = await request(setup.app.getHttpServer())
        .get(`/api/services?categoryId=${hairCategory.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((service: any) => {
        expect(service.categoryId).toBe(hairCategory.id);
      });
    });
  });

  describe('4. Customer Management', () => {
    it('should create customers successfully', async () => {
      customers = await setup.createTestCustomers();
      
      expect(customers).toHaveLength(3);
      expect(customers[0].firstName).toBe('Sarah');
      expect(customers[0].email).toBe('sarah.johnson@email.com');
    });

    it('should search customers by name', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/customers?search=sarah')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].firstName).toBe('Sarah');
    });

    it('should search customers by phone', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/customers?phone=1002')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].lastName).toBe('Chen');
    });

    it('should update customer information', async () => {
      const customerId = customers[0].id;
      const response = await request(setup.app.getHttpServer())
        .patch(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'VIP customer - prefers morning appointments',
        });

      expect(response.status).toBe(200);
      expect(response.body.notes).toBe('VIP customer - prefers morning appointments');
    });

    it('should export customers to CSV', async () => {
      const response = await request(setup.app.getHttpServer())
        .get('/api/customers/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('Sarah,Johnson');
    });
  });

  describe('5. Booking Calendar Functionality', () => {
    it('should check availability for services', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const manicureService = services.find(s => s.name === 'Classic Manicure');
      
      const response = await request(setup.app.getHttpServer())
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: tomorrow,
          serviceIds: [manicureService.id],
          staffId: setup.staffId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].available).toBe(true);
    });

    it('should create a booking', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const manicureService = services.find(s => s.name === 'Classic Manicure');
      const customer = customers[0];
      
      const response = await request(setup.app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          providerId: setup.staffId,
          startTime: `${tomorrow}T10:00:00Z`,
          services: [{
            serviceId: manicureService.id,
            price: manicureService.price,
            duration: manicureService.duration,
          }],
          totalAmount: manicureService.price,
          notes: 'First time customer',
        });

      expect(response.status).toBe(201);
      expect(response.body.bookingNumber).toBeDefined();
      expect(response.body.customer.id).toBe(customer.id);
      expect(response.body.status).toBe('CONFIRMED');
      
      bookings.push(response.body);
    });

    it('should prevent double booking', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const pedicureService = services.find(s => s.name === 'Classic Pedicure');
      const customer = customers[1];
      
      // Try to book same time slot
      const response = await request(setup.app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          providerId: setup.staffId,
          startTime: `${tomorrow}T10:00:00Z`,
          services: [{
            serviceId: pedicureService.id,
            price: pedicureService.price,
            duration: pedicureService.duration,
          }],
          totalAmount: pedicureService.price,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('not available');
    });

    it('should create multiple bookings at different times', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const haircutService = services.find(s => s.name === "Women's Haircut");
      const customer = customers[1];
      
      const response = await request(setup.app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          providerId: setup.staffId,
          startTime: `${tomorrow}T14:00:00Z`,
          services: [{
            serviceId: haircutService.id,
            price: haircutService.price,
            duration: haircutService.duration,
          }],
          totalAmount: haircutService.price,
        });

      expect(response.status).toBe(201);
      bookings.push(response.body);
    });

    it('should retrieve calendar view', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      
      const response = await request(setup.app.getHttpServer())
        .get(`/api/bookings/calendar?date=${tomorrow}&view=day`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bookings).toBeDefined();
      expect(response.body.bookings.length).toBe(2);
      expect(response.body.staff).toBeDefined();
      expect(response.body.view).toBe('day');
    });

    it('should update booking status', async () => {
      const bookingId = bookings[0].id;
      
      const response = await request(setup.app.getHttpServer())
        .patch(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('IN_PROGRESS');
      expect(response.body.checkedInAt).toBeDefined();
    });

    it('should complete booking and update customer stats', async () => {
      const bookingId = bookings[0].id;
      const customerId = bookings[0].customer.id;
      
      // Get customer before
      const customerBefore = await setup.prisma.customer.findUnique({
        where: { id: customerId },
      });
      
      // Complete booking
      const response = await request(setup.app.getHttpServer())
        .post(`/api/bookings/${bookingId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
      
      // Check customer stats updated
      const customerAfter = await setup.prisma.customer.findUnique({
        where: { id: customerId },
      });
      
      expect(customerAfter.visitCount).toBe(customerBefore.visitCount + 1);
      expect(customerAfter.totalSpent).toBeGreaterThan(customerBefore.totalSpent);
      expect(customerAfter.loyaltyPoints).toBeGreaterThan(customerBefore.loyaltyPoints);
    });

    it('should reschedule booking', async () => {
      const bookingId = bookings[1].id;
      const dayAfterTomorrow = format(addDays(new Date(), 2), 'yyyy-MM-dd');
      
      const response = await request(setup.app.getHttpServer())
        .patch(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startTime: `${dayAfterTomorrow}T15:00:00Z`,
        });

      expect(response.status).toBe(200);
      expect(response.body.startTime).toContain(dayAfterTomorrow);
    });

    it('should cancel booking', async () => {
      const bookingId = bookings[1].id;
      
      const response = await request(setup.app.getHttpServer())
        .patch(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CANCELLED',
          cancellationReason: 'Customer requested cancellation',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.cancellationReason).toBe('Customer requested cancellation');
      expect(response.body.cancelledAt).toBeDefined();
    });
  });

  describe('6. End-to-End Workflow', () => {
    it('should complete full booking workflow', async () => {
      // 1. Search for a service
      const serviceSearch = await request(setup.app.getHttpServer())
        .get('/api/services?search=facial')
        .set('Authorization', `Bearer ${authToken}`);
      
      const facialService = serviceSearch.body.data[0];
      expect(facialService).toBeDefined();
      
      // 2. Create a new customer
      const newCustomer = await request(setup.app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test.customer@email.com',
          mobile: '+14165559999',
          marketingConsent: true,
        });
      
      expect(newCustomer.status).toBe(201);
      
      // 3. Check availability
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const availability = await request(setup.app.getHttpServer())
        .post('/api/bookings/check-availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: nextWeek,
          serviceIds: [facialService.id],
        });
      
      expect(availability.body.length).toBeGreaterThan(0);
      const availableSlot = availability.body[0].slots[0];
      
      // 4. Create booking
      const booking = await request(setup.app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: newCustomer.body.id,
          providerId: setup.staffId,
          startTime: `${nextWeek}T${availableSlot.time}:00Z`,
          services: [{
            serviceId: facialService.id,
            price: facialService.price,
            duration: facialService.duration,
          }],
          totalAmount: facialService.price,
        });
      
      expect(booking.status).toBe(201);
      
      // 5. Verify booking appears in calendar
      const calendar = await request(setup.app.getHttpServer())
        .get(`/api/bookings/calendar?date=${nextWeek}&view=day`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const createdBooking = calendar.body.bookings.find(
        (b: any) => b.id === booking.body.id
      );
      expect(createdBooking).toBeDefined();
      
      console.log('Full workflow completed successfully!');
    });
  });

  describe('7. Performance and Data Integrity', () => {
    it('should handle concurrent bookings', async () => {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const services = await request(setup.app.getHttpServer())
        .get('/api/services?limit=3')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Try to create multiple bookings concurrently
      const bookingPromises = services.body.data.map((service: any, index: number) => {
        return request(setup.app.getHttpServer())
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            customerId: customers[index % customers.length].id,
            providerId: setup.staffId,
            startTime: `${tomorrow}T${10 + index * 2}:00:00Z`,
            services: [{
              serviceId: service.id,
              price: service.price,
              duration: service.duration,
            }],
            totalAmount: service.price,
          });
      });
      
      const results = await Promise.all(bookingPromises);
      const successfulBookings = results.filter(r => r.status === 201);
      
      expect(successfulBookings.length).toBeGreaterThan(0);
    });

    it('should maintain data consistency', async () => {
      // Check all bookings have valid relations
      const allBookings = await setup.prisma.booking.findMany({
        where: { merchantId: setup.merchantId },
        include: {
          customer: true,
          provider: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });
      
      allBookings.forEach(booking => {
        expect(booking.customer).toBeDefined();
        expect(booking.provider).toBeDefined();
        expect(booking.services.length).toBeGreaterThan(0);
        booking.services.forEach(bs => {
          expect(bs.service).toBeDefined();
        });
      });
    });
  });
});