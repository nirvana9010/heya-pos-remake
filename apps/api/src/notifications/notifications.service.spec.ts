import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { NotificationType, NotificationContext } from './interfaces/notification.interface';
import { NotificationLog } from '../entities/notification-log.entity';
import { Booking } from '../entities/booking.entity';
import { Customer } from '../entities/customer.entity';
import { Merchant } from '../entities/merchant.entity';
import { MerchantUser } from '../entities/merchant-user.entity';
import { Service } from '../entities/service.entity';

const describeNotificationsService =
  process.env.ENABLE_LEGACY_NOTIFICATIONS_TESTS === 'true' ? describe : describe.skip;

describeNotificationsService('NotificationsService', () => {
  let service: NotificationsService;
  let emailService: EmailService;
  let smsService: SmsService;
  let notificationLogRepository: Repository<NotificationLog>;
  let bookingRepository: Repository<Booking>;

  const mockMerchant: Partial<Merchant> = {
    id: 'merchant-123',
    name: 'Test Salon',
    email: 'salon@test.com',
    phone: '0412345678',
    website: 'www.testsalon.com',
  };

  const mockCustomer: Partial<Customer> = {
    id: 'customer-123',
    name: 'Jane Customer',
    email: 'customer@test.com',
    phone: '0487654321',
  };

  const mockStaff: Partial<MerchantUser> = {
    id: 'staff-123',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockService: Partial<Service> = {
    id: 'service-123',
    name: 'Haircut',
    duration: 30,
    price: 50,
  };

  const mockBooking: Partial<Booking> = {
    id: 'booking-123',
    bookingNumber: 'BK-001',
    date: new Date('2024-01-20'),
    time: '14:00',
    merchant: mockMerchant as Merchant,
    customer: mockCustomer as Customer,
    staff: mockStaff as MerchantUser,
    service: mockService as Service,
    status: 'confirmed',
  };

  const mockContext: NotificationContext = {
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
      locationAddress: '123 Test St',
      locationPhone: '0412345678',
    },
    merchant: {
      id: 'merchant-123',
      name: 'Test Salon',
      email: 'salon@test.com',
      phone: '0412345678',
      website: 'www.testsalon.com',
    },
    customer: {
      name: 'Jane Customer',
      email: 'customer@test.com',
      phone: '0487654321',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: EmailService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    notificationLogRepository = module.get<Repository<NotificationLog>>(
      getRepositoryToken(NotificationLog),
    );
    bookingRepository = module.get<Repository<Booking>>(
      getRepositoryToken(Booking),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendBookingNotification', () => {
    beforeEach(() => {
      (bookingRepository.findOne as jest.Mock).mockResolvedValue(mockBooking);
    });

    // Happy Path Tests
    it('should send both email and SMS notifications successfully', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });

      (smsService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'sms-123',
        channel: 'sms',
      });

      (notificationLogRepository.create as jest.Mock).mockReturnValue({});
      (notificationLogRepository.save as jest.Mock).mockResolvedValue({
        id: 'log-123',
      });

      const result = await service.sendBookingNotification('booking-123', type);

      expect(bookingRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        relations: ['merchant', 'customer', 'service', 'staff'],
      });

      expect(emailService.sendNotification).toHaveBeenCalledWith(
        type,
        expect.objectContaining({
          merchant: mockContext.merchant,
          customer: mockContext.customer,
        })
      );

      expect(smsService.sendNotification).toHaveBeenCalledWith(
        type,
        expect.objectContaining({
          merchant: mockContext.merchant,
          customer: mockContext.customer,
        })
      );

      expect(result).toEqual({
        email: {
          success: true,
          messageId: 'email-123',
          channel: 'email',
        },
        sms: {
          success: true,
          messageId: 'sms-123',
          channel: 'sms',
        },
      });

      // Verify logs were created
      expect(notificationLogRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle email success and SMS failure', async () => {
      const type = NotificationType.BOOKING_REMINDER_24H;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });

      (smsService.sendNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid phone number',
        channel: 'sms',
      });

      (notificationLogRepository.create as jest.Mock).mockReturnValue({});
      (notificationLogRepository.save as jest.Mock).mockResolvedValue({});

      const result = await service.sendBookingNotification('booking-123', type);

      expect(result.email.success).toBe(true);
      expect(result.sms.success).toBe(false);
      expect(result.sms.error).toBe('Invalid phone number');
    });

    it('should handle email failure and SMS success', async () => {
      const type = NotificationType.BOOKING_REMINDER_2H;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
        channel: 'email',
      });

      (smsService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'sms-123',
        channel: 'sms',
      });

      const result = await service.sendBookingNotification('booking-123', type);

      expect(result.email.success).toBe(false);
      expect(result.email.error).toBe('SMTP connection failed');
      expect(result.sms.success).toBe(true);
    });

    it('should handle both email and SMS failure', async () => {
      const type = NotificationType.BOOKING_CANCELLED;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Template not found',
        channel: 'email',
      });

      (smsService.sendNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMS gateway error',
        channel: 'sms',
      });

      const result = await service.sendBookingNotification('booking-123', type);

      expect(result.email.success).toBe(false);
      expect(result.sms.success).toBe(false);
    });

    // Edge Cases
    it('should handle booking not found', async () => {
      (bookingRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.sendBookingNotification('non-existent', NotificationType.BOOKING_CONFIRMATION)
      ).rejects.toThrow('Booking not found');

      expect(emailService.sendNotification).not.toHaveBeenCalled();
      expect(smsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle missing customer data', async () => {
      const bookingWithoutCustomer = {
        ...mockBooking,
        customer: null,
      };

      (bookingRepository.findOne as jest.Mock).mockResolvedValue(bookingWithoutCustomer);

      await expect(
        service.sendBookingNotification('booking-123', NotificationType.BOOKING_CONFIRMATION)
      ).rejects.toThrow('Booking has no customer');
    });

    it('should handle missing merchant data', async () => {
      const bookingWithoutMerchant = {
        ...mockBooking,
        merchant: null,
      };

      (bookingRepository.findOne as jest.Mock).mockResolvedValue(bookingWithoutMerchant);

      await expect(
        service.sendBookingNotification('booking-123', NotificationType.BOOKING_CONFIRMATION)
      ).rejects.toThrow('Booking has no merchant');
    });

    it('should skip notifications if already sent', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;

      // Mock that notifications were already sent
      (notificationLogRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing-email-log' }) // Email already sent
        .mockResolvedValueOnce({ id: 'existing-sms-log' }); // SMS already sent

      const result = await service.sendBookingNotification('booking-123', type);

      expect(emailService.sendNotification).not.toHaveBeenCalled();
      expect(smsService.sendNotification).not.toHaveBeenCalled();
      expect(result).toEqual({
        email: {
          success: false,
          error: 'Notification already sent',
          channel: 'email',
        },
        sms: {
          success: false,
          error: 'Notification already sent',
          channel: 'sms',
        },
      });
    });

    it('should handle notification log save failure gracefully', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });

      (notificationLogRepository.save as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw, but log the error
      const result = await service.sendBookingNotification('booking-123', type);

      expect(result.email.success).toBe(true);
    });

    // Different Notification Types
    it('should handle BOOKING_RESCHEDULED notification', async () => {
      const type = NotificationType.BOOKING_RESCHEDULED;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });

      (smsService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'sms-123',
        channel: 'sms',
      });

      const result = await service.sendBookingNotification('booking-123', type);

      expect(result.email.success).toBe(true);
      expect(result.sms.success).toBe(true);
    });

    it('should build correct notification context', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;

      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });

      await service.sendBookingNotification('booking-123', type);

      expect(emailService.sendNotification).toHaveBeenCalledWith(
        type,
        expect.objectContaining({
          booking: expect.objectContaining({
            id: 'booking-123',
            bookingNumber: 'BK-001',
            serviceName: 'Haircut',
            staffName: 'John Doe',
            duration: 30,
            price: 50,
          }),
          merchant: expect.objectContaining({
            id: 'merchant-123',
            name: 'Test Salon',
          }),
          customer: expect.objectContaining({
            name: 'Jane Customer',
            email: 'customer@test.com',
            phone: '0487654321',
          }),
        })
      );
    });

    it('should handle optional merchant location data', async () => {
      const merchantWithoutLocation = {
        ...mockMerchant,
        address: null,
      };

      const bookingWithMinimalMerchant = {
        ...mockBooking,
        merchant: merchantWithoutLocation as Merchant,
      };

      (bookingRepository.findOne as jest.Mock).mockResolvedValue(bookingWithMinimalMerchant);
      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });

      await service.sendBookingNotification('booking-123', NotificationType.BOOKING_CONFIRMATION);

      expect(emailService.sendNotification).toHaveBeenCalledWith(
        NotificationType.BOOKING_CONFIRMATION,
        expect.objectContaining({
          booking: expect.objectContaining({
            locationAddress: undefined,
          }),
        })
      );
    });
  });

  describe('logging', () => {
    it('should log successful notifications', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      (bookingRepository.findOne as jest.Mock).mockResolvedValue(mockBooking);
      (emailService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
        channel: 'email',
      });
      (smsService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'sms-123',
        channel: 'sms',
      });

      await service.sendBookingNotification('booking-123', NotificationType.BOOKING_CONFIRMATION);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending booking_confirmation notifications')
      );
    });

    it('should log errors when notifications fail', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      (bookingRepository.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        service.sendBookingNotification('booking-123', NotificationType.BOOKING_CONFIRMATION)
      ).rejects.toThrow('Database error');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notifications'),
        expect.any(Error)
      );
    });
  });
});
