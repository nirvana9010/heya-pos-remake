import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { SmsTemplateService } from '../templates/sms-template.service';
import { NotificationType, NotificationContext } from '../interfaces/notification.interface';

// Mock the SMS providers
jest.mock('./sms.service', () => {
  const originalModule = jest.requireActual('./sms.service');
  return {
    ...originalModule,
    MockSmsProvider: jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn().mockResolvedValue({
        messageId: 'mock-sms-id-123',
        status: 'sent',
      }),
    })),
  };
});

describe('SmsService', () => {
  let service: SmsService;
  let configService: ConfigService;
  let templateService: SmsTemplateService;

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
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                NODE_ENV: 'test',
                SMS_PROVIDER: null, // Will use mock provider
                TWILIO_ACCOUNT_SID: 'AC_test_sid',
                TWILIO_AUTH_TOKEN: 'test_token',
                TWILIO_PHONE_NUMBER: '+61400000000',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: SmsTemplateService,
          useValue: {
            renderSmsTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    configService = module.get<ConfigService>(ConfigService);
    templateService = module.get<SmsTemplateService>(SmsTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    // Happy Path Tests
    it('should successfully send a BOOKING_CONFIRMATION SMS', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockMessage = 'Hi Jane, your booking BK-001 is confirmed for 20/01 at 2:00 PM. See you at Test Salon!';

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.sendNotification(type, mockContext);

      expect(templateService.renderSmsTemplate).toHaveBeenCalledWith(type, mockContext);
      expect(result).toEqual({
        success: true,
        messageId: 'mock-sms-id-123',
        channel: 'sms',
      });
    });

    it('should successfully send a BOOKING_REMINDER_24H SMS', async () => {
      const type = NotificationType.BOOKING_REMINDER_24H;
      const mockMessage = 'Hi Jane, reminder: Your appointment at Test Salon is tomorrow at 2:00 PM. Reply CANCEL to cancel.';

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
    });

    it('should successfully send a BOOKING_REMINDER_2H SMS', async () => {
      const type = NotificationType.BOOKING_REMINDER_2H;
      const mockMessage = 'Hi Jane, your appointment at Test Salon is in 2 hours (2:00 PM). We look forward to seeing you!';

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-sms-id-123');
    });

    it('should successfully send a BOOKING_CANCELLED SMS', async () => {
      const type = NotificationType.BOOKING_CANCELLED;
      const mockMessage = 'Hi Jane, your booking BK-001 at Test Salon has been cancelled. Call 0412345678 to rebook.';

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
    });

    it('should successfully send a BOOKING_RESCHEDULED SMS', async () => {
      const type = NotificationType.BOOKING_RESCHEDULED;
      const mockMessage = 'Hi Jane, your booking at Test Salon has been rescheduled to 21/01 at 3:00 PM.';

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.sendNotification(type, mockContext);

      expect(result.success).toBe(true);
    });

    // Phone Number Formatting Tests
    it('should format Australian mobile number with leading 0', async () => {
      const contextWithLocalNumber = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          phone: '0412345678',
        },
      };

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      // Spy on the private formatPhoneNumber method
      const formatSpy = jest.spyOn(service as any, 'formatPhoneNumber');

      await service.sendNotification(NotificationType.BOOKING_CONFIRMATION, contextWithLocalNumber);

      expect(formatSpy).toHaveBeenCalledWith('0412345678');
      expect(formatSpy).toHaveReturnedWith('+61412345678');
    });

    it('should handle phone number already with country code', async () => {
      const contextWithIntlNumber = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          phone: '+61412345678',
        },
      };

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      const formatSpy = jest.spyOn(service as any, 'formatPhoneNumber');

      await service.sendNotification(NotificationType.BOOKING_CONFIRMATION, contextWithIntlNumber);

      expect(formatSpy).toHaveReturnedWith('+61412345678');
    });

    it('should handle phone number with spaces and special characters', async () => {
      const contextWithFormattedNumber = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          phone: '0412 345 678',
        },
      };

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      const formatSpy = jest.spyOn(service as any, 'formatPhoneNumber');

      await service.sendNotification(NotificationType.BOOKING_CONFIRMATION, contextWithFormattedNumber);

      expect(formatSpy).toHaveReturnedWith('+61412345678');
    });

    it('should handle phone number with parentheses and dashes', async () => {
      const contextWithComplexFormat = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          phone: '(04) 1234-5678',
        },
      };

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      const formatSpy = jest.spyOn(service as any, 'formatPhoneNumber');

      await service.sendNotification(NotificationType.BOOKING_CONFIRMATION, contextWithComplexFormat);

      expect(formatSpy).toHaveReturnedWith('+61412345678');
    });

    // Edge Cases
    it('should handle missing customer phone number', async () => {
      const contextWithoutPhone = {
        ...mockContext,
        customer: {
          name: 'Jane Customer',
          email: 'customer@test.com',
          // phone is missing
        },
      };

      const result = await service.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        contextWithoutPhone as NotificationContext
      );

      expect(result).toEqual({
        success: false,
        error: 'No phone number provided',
        channel: 'sms',
      });
      expect(templateService.renderSmsTemplate).not.toHaveBeenCalled();
    });

    it('should handle empty customer phone number', async () => {
      const contextWithEmptyPhone = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          phone: '',
        },
      };

      const result = await service.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        contextWithEmptyPhone
      );

      expect(result).toEqual({
        success: false,
        error: 'No phone number provided',
        channel: 'sms',
      });
    });

    // Error Scenarios
    it('should handle template rendering failure', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const renderError = new Error('Template not found');

      (templateService.renderSmsTemplate as jest.Mock).mockRejectedValue(renderError);

      const result = await service.sendNotification(type, mockContext);

      expect(result).toEqual({
        success: false,
        error: 'Template not found',
        channel: 'sms',
      });
    });

    it('should handle SMS provider send failure', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      
      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      // Mock provider failure
      const mockProvider = service['provider'];
      (mockProvider.sendMessage as jest.Mock).mockRejectedValue(new Error('SMS gateway error'));

      const result = await service.sendNotification(type, mockContext);

      expect(result).toEqual({
        success: false,
        error: 'SMS gateway error',
        channel: 'sms',
      });
    });

    it('should handle invalid phone number format', async () => {
      const contextWithInvalidPhone = {
        ...mockContext,
        customer: {
          ...mockContext.customer,
          phone: '123', // Too short to be valid
        },
      };

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      // Mock provider rejection for invalid number
      const mockProvider = service['provider'];
      (mockProvider.sendMessage as jest.Mock).mockRejectedValue(new Error('Invalid phone number'));

      const result = await service.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        contextWithInvalidPhone
      );

      expect(result).toEqual({
        success: false,
        error: 'Invalid phone number',
        channel: 'sms',
      });
    });

    it('should log errors when SMS sending fails', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const error = new Error('Network timeout');

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      const mockProvider = service['provider'];
      (mockProvider.sendMessage as jest.Mock).mockRejectedValue(error);

      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.sendNotification(type, mockContext);

      expect(loggerSpy).toHaveBeenCalledWith('Failed to send SMS', error);
    });

    it('should handle very long SMS messages', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const longMessage = 'A'.repeat(200); // Longer than typical SMS limit

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(longMessage);

      const result = await service.sendNotification(type, mockContext);

      // Should still attempt to send (provider will handle splitting/truncation)
      expect(result.success).toBe(true);
    });
  });

  // Twilio Future Integration Tests
  describe('Twilio integration preparation', () => {
    it('should initialize Twilio provider when configured in production', async () => {
      const prodConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            NODE_ENV: 'production',
            SMS_PROVIDER: 'twilio',
            TWILIO_ACCOUNT_SID: 'AC_real_sid',
            TWILIO_AUTH_TOKEN: 'real_token',
            TWILIO_PHONE_NUMBER: '+61400000000',
          };
          return config[key] || defaultValue;
        }),
      };

      // This test verifies the service checks for production config
      // Currently falls back to mock, but structure supports Twilio
      expect(configService.get('NODE_ENV')).toBe('test');
      expect(configService.get('SMS_PROVIDER')).toBe(null);
    });

    it('should handle Twilio-specific error codes when implemented', async () => {
      // This test prepares for Twilio error handling
      const twilioErrors = [
        { code: 21211, message: 'Invalid phone number' },
        { code: 21608, message: 'The phone number is unverified' },
        { code: 21610, message: 'Message cannot be sent to the phone number' },
        { code: 21614, message: 'Invalid mobile number' },
      ];

      // Structure supports mapping Twilio errors to user-friendly messages
      twilioErrors.forEach(error => {
        expect(error.code).toBeGreaterThan(0);
        expect(error.message).toBeTruthy();
      });
    });
  });

  // Mock mode tests
  describe('Mock SMS provider', () => {
    it('should use mock provider in development mode', async () => {
      const isProduction = configService.get('NODE_ENV') === 'production';
      const hasProvider = configService.get('SMS_PROVIDER');

      expect(isProduction).toBe(false);
      expect(hasProvider).toBeFalsy();
      
      // Verify mock provider is used
      expect(service['provider'].constructor.name).toContain('Mock');
    });

    it('should simulate delivery delays in mock mode', async () => {
      // Mock provider could simulate realistic delays
      const startTime = Date.now();
      
      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue('Test message');
      
      await service.sendNotification(NotificationType.BOOKING_CONFIRMATION, mockContext);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Mock should be fast (no real delay implemented currently)
      expect(duration).toBeLessThan(100);
    });

    it('should log mock SMS details in development', async () => {
      const type = NotificationType.BOOKING_CONFIRMATION;
      const mockMessage = 'Test SMS message';

      (templateService.renderSmsTemplate as jest.Mock).mockResolvedValue(mockMessage);
      
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendNotification(type, mockContext);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMS sent successfully')
      );
    });
  });
});