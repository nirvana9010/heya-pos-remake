import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from './notifications.module';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { NotificationType } from './interfaces/notification.interface';
import {
  MockSendGridProvider,
  MockTwilioProvider,
  MockEmailTransport,
  NotificationDashboard,
} from './mocks/notification-mocks';

describe('NotificationsModule Integration Tests', () => {
  let module: TestingModule;
  let notificationsService: NotificationsService;
  let emailService: EmailService;
  let smsService: SmsService;
  let dashboard: NotificationDashboard;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.USE_MOCKS = 'true';
    process.env.MOCK_DELAY = 'false'; // Disable delays for tests

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [
            () => ({
              // Email configuration
              EMAIL_PROVIDER: 'sendgrid',
              SENDGRID_API_KEY: 'SG.test-key',
              EMAIL_FROM: 'test@heyapos.com',
              EMAIL_HOST: 'smtp.test.com',
              EMAIL_PORT: 587,
              EMAIL_USER: 'test@test.com',
              EMAIL_PASS: 'testpass',

              // SMS configuration
              SMS_PROVIDER: 'twilio',
              TWILIO_ACCOUNT_SID: 'AC_test_sid',
              TWILIO_AUTH_TOKEN: 'test_token',
              TWILIO_PHONE_NUMBER: '+61400000000',

              // Mock configuration
              USE_MOCKS: true,
              MOCK_DELAY: false,
            }),
          ],
        }),
        // Note: In real integration tests, you'd include TypeOrmModule
        // For this example, we're focusing on the notification services
        NotificationsModule,
      ],
    }).compile();

    notificationsService = module.get<NotificationsService>(NotificationsService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    
    dashboard = NotificationDashboard.getInstance();
    dashboard.clearNotifications();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Mock Provider Integration', () => {
    it('should use mock providers in test environment', async () => {
      expect(emailService).toBeDefined();
      expect(smsService).toBeDefined();
    });

    it('should successfully send email using mock SendGrid provider', async () => {
      const mockContext = {
        booking: {
          id: 'booking-123',
          bookingNumber: 'BK-001',
          date: new Date('2024-01-20'),
          time: '14:00',
          serviceName: 'Haircut',
          staffName: 'John Doe',
          duration: 30,
          price: 50,
          locationName: 'Test Salon',
        },
        merchant: {
          id: 'merchant-123',
          name: 'Test Salon',
          email: 'salon@test.com',
        },
        customer: {
          name: 'Jane Customer',
          email: 'customer@test.com',
          phone: '0487654321',
        },
      };

      const result = await emailService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock');
      expect(result.channel).toBe('email');

      // Check dashboard
      const notifications = dashboard.getNotifications('email');
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should successfully send SMS using mock Twilio provider', async () => {
      const mockContext = {
        booking: {
          id: 'booking-123',
          bookingNumber: 'BK-001',
          date: new Date('2024-01-20'),
          time: '14:00',
          serviceName: 'Haircut',
          staffName: 'John Doe',
          duration: 30,
          price: 50,
          locationName: 'Test Salon',
        },
        merchant: {
          id: 'merchant-123',
          name: 'Test Salon',
          phone: '0412345678',
        },
        customer: {
          name: 'Jane Customer',
          email: 'customer@test.com',
          phone: '0487654321',
        },
      };

      const result = await smsService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock');
      expect(result.channel).toBe('sms');
    });

    it('should handle email failure scenarios with mock provider', async () => {
      const mockContext = {
        booking: {
          id: 'booking-123',
          bookingNumber: 'BK-001',
          date: new Date(),
          time: '14:00',
          serviceName: 'Test Service',
          staffName: 'Staff',
          duration: 30,
          price: 50,
          locationName: 'Test Location',
        },
        merchant: {
          id: 'merchant-123',
          name: 'Test Merchant',
        },
        customer: {
          name: 'Test Customer',
          email: 'fail@test.com', // Trigger mock failure
          phone: '0400000000',
        },
      };

      const result = await emailService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient address');
    });

    it('should handle SMS failure scenarios with mock provider', async () => {
      const mockContext = {
        booking: {
          id: 'booking-123',
          bookingNumber: 'BK-001',
          date: new Date(),
          time: '14:00',
          serviceName: 'Test Service',
          staffName: 'Staff',
          duration: 30,
          price: 50,
          locationName: 'Test Location',
        },
        merchant: {
          id: 'merchant-123',
          name: 'Test Merchant',
        },
        customer: {
          name: 'Test Customer',
          email: 'test@test.com',
          phone: '0400000000', // Will trigger mock failure
        },
      };

      const result = await smsService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Undeliverable');
    });
  });

  describe('Dashboard Statistics', () => {
    it('should track notification statistics', async () => {
      // Clear previous notifications
      dashboard.clearNotifications();

      const contexts = [
        {
          customer: { name: 'Customer 1', email: 'customer1@test.com', phone: '0411111111' },
          booking: { id: '1', bookingNumber: 'BK-001', date: new Date(), time: '10:00', serviceName: 'Service 1', staffName: 'Staff 1', duration: 30, price: 50, locationName: 'Location 1' },
          merchant: { id: 'm1', name: 'Merchant 1' },
        },
        {
          customer: { name: 'Customer 2', email: 'customer2@test.com', phone: '0422222222' },
          booking: { id: '2', bookingNumber: 'BK-002', date: new Date(), time: '11:00', serviceName: 'Service 2', staffName: 'Staff 2', duration: 45, price: 75, locationName: 'Location 2' },
          merchant: { id: 'm2', name: 'Merchant 2' },
        },
        {
          customer: { name: 'Customer 3', email: 'fail@test.com', phone: '0433333333' }, // Will fail
          booking: { id: '3', bookingNumber: 'BK-003', date: new Date(), time: '12:00', serviceName: 'Service 3', staffName: 'Staff 3', duration: 60, price: 100, locationName: 'Location 3' },
          merchant: { id: 'm3', name: 'Merchant 3' },
        },
      ];

      // Send notifications
      for (const context of contexts) {
        await emailService.sendNotification(NotificationType.BOOKING_CONFIRMATION, context);
        await smsService.sendNotification(NotificationType.BOOKING_CONFIRMATION, context);
      }

      const stats = dashboard.getStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.emails).toBeGreaterThan(0);
      expect(stats.sms).toBeGreaterThan(0);
      expect(stats.failed).toBeGreaterThan(0); // At least one should fail
      expect(parseFloat(stats.successRate)).toBeGreaterThan(0);
      expect(parseFloat(stats.successRate)).toBeLessThan(100); // Not all should succeed
    });
  });

  describe('Different Notification Types', () => {
    const baseContext = {
      booking: {
        id: 'booking-456',
        bookingNumber: 'BK-456',
        date: new Date('2024-01-25'),
        time: '15:30',
        serviceName: 'Massage',
        staffName: 'Jane Smith',
        duration: 60,
        price: 120,
        locationName: 'Wellness Center',
        locationAddress: '456 Wellness St',
        locationPhone: '0498765432',
      },
      merchant: {
        id: 'merchant-456',
        name: 'Wellness Center',
        email: 'info@wellness.com',
        phone: '0498765432',
        website: 'www.wellness.com',
      },
      customer: {
        name: 'John Customer',
        email: 'john@customer.com',
        phone: '0456789012',
      },
    };

    it('should send BOOKING_REMINDER_24H notification', async () => {
      const emailResult = await emailService.sendNotification(
        NotificationType.BOOKING_REMINDER_24H,
        baseContext,
      );
      const smsResult = await smsService.sendNotification(
        NotificationType.BOOKING_REMINDER_24H,
        baseContext,
      );

      expect(emailResult.success).toBe(true);
      expect(smsResult.success).toBe(true);
    });

    it('should send BOOKING_REMINDER_2H notification', async () => {
      const emailResult = await emailService.sendNotification(
        NotificationType.BOOKING_REMINDER_2H,
        baseContext,
      );
      const smsResult = await smsService.sendNotification(
        NotificationType.BOOKING_REMINDER_2H,
        baseContext,
      );

      expect(emailResult.success).toBe(true);
      expect(smsResult.success).toBe(true);
    });

    it('should send BOOKING_CANCELLED notification', async () => {
      const emailResult = await emailService.sendNotification(
        NotificationType.BOOKING_CANCELLED,
        baseContext,
      );
      const smsResult = await smsService.sendNotification(
        NotificationType.BOOKING_CANCELLED,
        baseContext,
      );

      expect(emailResult.success).toBe(true);
      expect(smsResult.success).toBe(true);
    });

    it('should send BOOKING_RESCHEDULED notification', async () => {
      const emailResult = await emailService.sendNotification(
        NotificationType.BOOKING_RESCHEDULED,
        baseContext,
      );
      const smsResult = await smsService.sendNotification(
        NotificationType.BOOKING_RESCHEDULED,
        baseContext,
      );

      expect(emailResult.success).toBe(true);
      expect(smsResult.success).toBe(true);
    });
  });

  describe('Mock Provider Edge Cases', () => {
    it('should handle bounce email addresses', async () => {
      const context = {
        booking: { id: '1', bookingNumber: 'BK-001', date: new Date(), time: '10:00', serviceName: 'Service', staffName: 'Staff', duration: 30, price: 50, locationName: 'Location' },
        merchant: { id: 'm1', name: 'Merchant' },
        customer: {
          name: 'Bounce Test',
          email: 'bounce@test.com',
          phone: '0411111111',
        },
      };

      const result = await emailService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('bounced');
    });

    it('should handle invalid phone numbers', async () => {
      const context = {
        booking: { id: '1', bookingNumber: 'BK-001', date: new Date(), time: '10:00', serviceName: 'Service', staffName: 'Staff', duration: 30, price: 50, locationName: 'Location' },
        merchant: { id: 'm1', name: 'Merchant' },
        customer: {
          name: 'Invalid Phone',
          email: 'test@test.com',
          phone: '123', // Too short
        },
      };

      const result = await smsService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
    });

    it('should handle long SMS messages', async () => {
      const longServiceName = 'A'.repeat(150);
      const context = {
        booking: { 
          id: '1', 
          bookingNumber: 'BK-001', 
          date: new Date(), 
          time: '10:00', 
          serviceName: longServiceName, 
          staffName: 'Staff', 
          duration: 30, 
          price: 50, 
          locationName: 'Location' 
        },
        merchant: { id: 'm1', name: 'Merchant' },
        customer: {
          name: 'Test Customer',
          email: 'test@test.com',
          phone: '0411111111',
        },
      };

      const result = await smsService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        context,
      );

      // Should handle long messages (provider will split into segments)
      expect(result.success).toBe(true);
    });
  });
});