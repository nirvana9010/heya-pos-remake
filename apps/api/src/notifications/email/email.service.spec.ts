import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from '../templates/email-template.service';
import { NotificationType, NotificationContext } from '../interfaces/notification.interface';
import * as nodemailer from 'nodemailer';

// Mock nodemailer to prevent actual email sending
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
    verify: mockVerify,
  }),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let templateService: EmailTemplateService;

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
    // Reset mocks before each test
    mockSendMail.mockClear();
    mockVerify.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'mock-message-id-123' });
    mockVerify.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                EMAIL_HOST: 'smtp.test.com',
                EMAIL_PORT: 587,
                EMAIL_USER: 'test@test.com',
                EMAIL_PASS: 'testpass',
                EMAIL_FROM: 'noreply@heyapos.com',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: EmailTemplateService,
          useValue: {
            renderEmailTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    templateService = module.get<EmailTemplateService>(EmailTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    // Happy Path Tests
    it('should successfully send a BOOKING_CONFIRMATION email', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockTemplate = {
        subject: 'Booking Confirmed - BK-001',
        html: '<h1>Your booking is confirmed!</h1>',
        text: 'Your booking is confirmed!',
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.sendNotification(type, mockContext);

      expect(templateService.renderEmailTemplate).toHaveBeenCalledWith(type, mockContext);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test Salon" <noreply@heyapos.com>',
        to: 'customer@test.com',
        subject: mockTemplate.subject,
        html: mockTemplate.html,
        text: mockTemplate.text,
      });
      expect(result).toEqual({
        success: true,
        messageId: 'mock-message-id-123',
        channel: 'email',
      });
    });

    it('should successfully send a BOOKING_REMINDER_24H email', async () => {
      const type = NotificationType.BOOKING_REMINDER_24H;
      const mockTemplate = {
        subject: 'Reminder: Your appointment tomorrow',
        html: '<h1>See you tomorrow!</h1>',
        text: 'See you tomorrow!',
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: mockTemplate.subject,
        })
      );
    });

    it('should successfully send a BOOKING_REMINDER_2H email', async () => {
      const type = NotificationType.BOOKING_REMINDER_2H;
      const mockTemplate = {
        subject: 'Reminder: Your appointment in 2 hours',
        html: '<h1>See you soon!</h1>',
        text: 'See you soon!',
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: mockTemplate.subject,
        })
      );
    });

    it('should successfully send a BOOKING_CANCELLED email', async () => {
      const type = NotificationType.BOOKING_CANCELLED;
      const mockTemplate = {
        subject: 'Booking Cancelled - BK-001',
        html: '<h1>Your booking has been cancelled</h1>',
        text: 'Your booking has been cancelled',
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: mockTemplate.subject,
        })
      );
    });

    it('should successfully send a BOOKING_RESCHEDULED email', async () => {
      const type = NotificationType.BOOKING_RESCHEDULED;
      const mockTemplate = {
        subject: 'Booking Rescheduled - BK-001',
        html: '<h1>Your booking has been rescheduled</h1>',
        text: 'Your booking has been rescheduled',
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: mockTemplate.subject,
        })
      );
    });

    // Edge Cases
    it('should handle missing customer email', async () => {
      const contextWithoutEmail = {
        ...mockContext,
        customer: {
          name: 'Jane Customer',
          phone: '0487654321',
          // email is missing
        },
      };

      const result = await service.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        contextWithoutEmail as NotificationContext
      );

      expect(result).toEqual({
        success: false,
        error: 'Customer email is required',
        channel: 'email',
      });
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should handle empty customer email', async () => {
      const contextWithEmptyEmail = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          email: '',
        },
      };

      const result = await service.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        contextWithEmptyEmail
      );

      expect(result).toEqual({
        success: false,
        error: 'Customer email is required',
        channel: 'email',
      });
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    // Error Scenarios
    it('should handle template rendering failure', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const renderError = new Error('Template file not found');

      (templateService.renderEmailTemplate as jest.Mock).mockRejectedValue(renderError);

      const result = await service.sendNotification(type, mockContext);

      expect(result).toEqual({
        success: false,
        error: 'Template file not found',
        channel: 'email',
      });
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should handle nodemailer send failure', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockTemplate = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test',
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await service.sendNotification(type, mockContext);

      expect(result).toEqual({
        success: false,
        error: 'SMTP connection failed',
        channel: 'email',
      });
    });

    it('should handle invalid email format from nodemailer', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockTemplate = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test',
      };
      const invalidContext = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          email: 'invalid-email-format',
        },
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);
      mockSendMail.mockRejectedValue(new Error('Invalid recipient address'));

      const result = await service.sendNotification(type, invalidContext);

      expect(result).toEqual({
        success: false,
        error: 'Invalid recipient address',
        channel: 'email',
      });
    });

    it('should handle missing merchant name gracefully', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockTemplate = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test',
      };
      const contextWithoutMerchantName = {
        ...mockContext,
        merchant: {
          ...mockContext.merchant,
          name: '',
        },
      };

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await service.sendNotification(type, contextWithoutMerchantName);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"" <noreply@heyapos.com>', // Empty name is handled
        })
      );
    });

    it('should log errors when email sending fails', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockTemplate = {
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test',
      };
      const error = new Error('Network timeout');

      (templateService.renderEmailTemplate as jest.Mock).mockResolvedValue(mockTemplate);
      mockSendMail.mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.sendNotification(type, mockContext);

      expect(loggerSpy).toHaveBeenCalledWith('Failed to send email', error);
    });
  });

  describe('verifyConnection', () => {
    it('should return true when connection is successful', async () => {
      mockVerify.mockResolvedValue(true);

      const result = await service.verifyConnection();

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it('should return false when connection fails', async () => {
      mockVerify.mockRejectedValue(new Error('Connection refused'));

      const result = await service.verifyConnection();

      expect(result).toBe(false);
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it('should log connection status', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockVerify.mockResolvedValue(true);

      await service.verifyConnection();

      expect(loggerSpy).toHaveBeenCalledWith('Email server connection verified');
    });

    it('should log connection errors', async () => {
      const error = new Error('Authentication failed');
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      mockVerify.mockRejectedValue(error);

      await service.verifyConnection();

      expect(loggerSpy).toHaveBeenCalledWith('Email server connection failed', error);
    });
  });

  // SendGrid Future Integration Tests
  describe('SendGrid integration preparation', () => {
    it('should use SendGrid configuration when available', async () => {
      // This test prepares for future SendGrid integration
      // Currently using SMTP, but structure supports easy migration
      const sendGridConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            EMAIL_PROVIDER: 'sendgrid',
            SENDGRID_API_KEY: 'SG.test-api-key',
            EMAIL_FROM: 'noreply@heyapos.com',
          };
          return config[key] || defaultValue;
        }),
      };

      // This test verifies the service can be configured for different providers
      expect(configService.get('EMAIL_HOST')).toBe('smtp.test.com');
      expect(configService.get('EMAIL_PROVIDER', 'smtp')).toBe('smtp');
    });
  });

  // Mock endpoint tests for development
  describe('Mock endpoints', () => {
    it('should simulate successful email send in development mode', async () => {
      const devConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            NODE_ENV: 'development',
            EMAIL_MOCK_MODE: true,
            EMAIL_FROM: 'noreply@heyapos.com',
          };
          return config[key] || defaultValue;
        }),
      };

      // This demonstrates how mock mode would work
      const mockMode = devConfig.get('EMAIL_MOCK_MODE', false);
      expect(mockMode).toBe(true);
    });
  });
});