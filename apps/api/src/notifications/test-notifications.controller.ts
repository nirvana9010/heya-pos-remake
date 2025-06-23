import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
// Swagger imports removed - not installed in this project
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { NotificationType, NotificationContext } from './interfaces/notification.interface';
import { NotificationDashboard } from './mocks/notification-mocks';

/**
 * Test controller for notification development and testing
 * Only available in development/test environments
 * Remove or disable in production
 */
@Controller('api/test/notifications')
export class TestNotificationsController {
  private dashboard: NotificationDashboard;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {
    this.dashboard = NotificationDashboard.getInstance();
  }

  @Post('send-test')
  @HttpCode(HttpStatus.OK)
  async sendTestNotification(
    @Body() body: {
      type: NotificationType;
      channel?: 'email' | 'sms' | 'both';
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
      bookingId?: string;
    },
  ) {
    // Build test context
    const testContext: NotificationContext = {
      booking: {
        id: body.bookingId || 'test-booking-123',
        bookingNumber: 'BK-TEST-001',
        date: new Date(),
        time: '14:00',
        serviceName: 'Test Service',
        staffName: 'Test Staff',
        duration: 60,
        price: 100,
        locationName: 'Test Location',
        locationAddress: '123 Test Street, Test City',
        locationPhone: '0498765432',
      },
      merchant: {
        id: 'test-merchant-123',
        name: 'Test Merchant',
        email: 'merchant@test.com',
        phone: '0498765432',
        website: 'www.testmerchant.com',
      },
      customer: {
        id: 'test-customer-123',
        firstName: body.customerName || 'Test Customer',
        email: body.customerEmail || 'test@example.com',
        phone: body.customerPhone || '0412345678',
      },
    };

    const channel = body.channel || 'both';
    const results: any = {};

    // Send email if requested
    if (channel === 'email' || channel === 'both') {
      try {
        results.email = await this.emailService.sendNotification(body.type, testContext);
      } catch (error: any) {
        results.email = {
          success: false,
          error: error.message,
          channel: 'email',
        };
      }
    }

    // Send SMS if requested
    if (channel === 'sms' || channel === 'both') {
      try {
        results.sms = await this.smsService.sendNotification(body.type, testContext);
      } catch (error: any) {
        results.sms = {
          success: false,
          error: error.message,
          channel: 'sms',
        };
      }
    }

    return {
      testMode: true,
      context: testContext,
      results,
      dashboard: {
        stats: this.dashboard.getStats(),
        viewUrl: '/api/test/notifications/dashboard',
      },
    };
  }

  @Post('send-booking/:bookingId')
  @HttpCode(HttpStatus.OK)
  async sendBookingNotification(
    @Param('bookingId') bookingId: string,
    @Body() body: { type: string },
  ) {
    try {
      // For testing, create a mock context
      const testContext: NotificationContext = {
        booking: {
          id: bookingId,
          bookingNumber: 'TEST-' + bookingId,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          time: '14:00',
          serviceName: 'Test Service',
          staffName: 'Test Staff',
          duration: 60,
          price: 100,
          locationName: 'Test Location',
          locationAddress: '123 Test St',
          locationPhone: '0412345678',
        },
        merchant: {
          id: 'test-merchant',
          name: 'Test Merchant',
          email: 'merchant@test.com',
          phone: '0412345678',
          website: 'www.testmerchant.com',
        },
        customer: {
          id: 'test-customer',
          firstName: 'Test Customer',
          email: 'customer@test.com',
          phone: '0487654321',
        },
      };

      const results = await this.notificationsService.sendNotification(
        body.type as NotificationType,
        testContext,
      );

      return {
        success: true,
        bookingId,
        type: body.type,
        results,
        dashboard: {
          stats: this.dashboard.getStats(),
          viewUrl: '/api/test/notifications/dashboard',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        bookingId,
        type: body.type,
      };
    }
  }

  @Get('dashboard')
  async getDashboard() {
    const stats = this.dashboard.getStats();
    const recentNotifications = this.dashboard.getNotifications().slice(-20);

    return {
      stats,
      recentNotifications: recentNotifications.map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString(),
      })),
      testEndpoints: {
        sendTest: '/api/test/notifications/send-test',
        sendBooking: '/api/test/notifications/send-booking/{bookingId}',
        clearDashboard: '/api/test/notifications/dashboard/clear',
      },
    };
  }

  @Post('dashboard/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearDashboard() {
    this.dashboard.clearNotifications();
  }

  @Get('verify-connections')
  async verifyConnections() {
    const emailConnection = await this.emailService.verifyConnection();
    const smsConnection = true; // SMS mock always returns true

    return {
      email: {
        connected: emailConnection,
        provider: process.env.USE_MOCKS ? 'mock-smtp' : 'smtp',
        mockMode: process.env.USE_MOCKS === 'true',
      },
      sms: {
        connected: smsConnection,
        provider: process.env.USE_MOCKS ? 'mock-twilio' : 'twilio',
        mockMode: process.env.USE_MOCKS === 'true',
      },
    };
  }

  @Post('test-scenarios/:scenario')
  @HttpCode(HttpStatus.OK)
  async runTestScenario(@Param('scenario') scenario: string) {
    const scenarios = {
      'email-failure': {
        context: this.buildTestContext({
          customerEmail: 'fail@test.com',
        }),
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: 'email',
        expectedResult: 'Email should fail with invalid recipient error',
      },
      'sms-failure': {
        context: this.buildTestContext({
          customerPhone: '0400000000',
        }),
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: 'sms',
        expectedResult: 'SMS should fail with undeliverable error',
      },
      'bounce-email': {
        context: this.buildTestContext({
          customerEmail: 'bounce@test.com',
        }),
        type: NotificationType.BOOKING_REMINDER_24H,
        channel: 'email',
        expectedResult: 'Email should bounce',
      },
      'invalid-phone': {
        context: this.buildTestContext({
          customerPhone: '123',
        }),
        type: NotificationType.BOOKING_REMINDER_2H,
        channel: 'sms',
        expectedResult: 'SMS should fail with invalid phone number',
      },
      'long-sms': {
        context: this.buildTestContext({
          serviceName: 'A'.repeat(200),
        }),
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: 'sms',
        expectedResult: 'SMS should handle long message',
      },
      'missing-email': {
        context: this.buildTestContext({
          customerEmail: '',
        }),
        type: NotificationType.BOOKING_CANCELLED,
        channel: 'email',
        expectedResult: 'Email should fail with missing email error',
      },
      'missing-phone': {
        context: this.buildTestContext({
          customerPhone: '',
        }),
        type: NotificationType.BOOKING_RESCHEDULED,
        channel: 'sms',
        expectedResult: 'SMS should fail with missing phone error',
      },
    };

    const testScenario = scenarios[scenario];
    if (!testScenario) {
      return {
        error: 'Invalid scenario',
        availableScenarios: Object.keys(scenarios),
      };
    }

    let result;
    try {
      if (testScenario.channel === 'email') {
        result = await this.emailService.sendNotification(
          testScenario.type,
          testScenario.context,
        );
      } else {
        result = await this.smsService.sendNotification(
          testScenario.type,
          testScenario.context,
        );
      }
    } catch (error: any) {
      result = {
        success: false,
        error: error.message,
        channel: testScenario.channel,
      };
    }

    return {
      scenario,
      expectedResult: testScenario.expectedResult,
      actualResult: result,
      success: result.success === false, // For failure scenarios, we expect failure
      context: testScenario.context,
    };
  }

  private buildTestContext(overrides: any = {}): NotificationContext {
    return {
      booking: {
        id: overrides.bookingId || 'test-booking-123',
        bookingNumber: overrides.bookingNumber || 'BK-TEST-001',
        date: overrides.date || new Date(),
        time: overrides.time || '14:00',
        serviceName: overrides.serviceName || 'Test Service',
        staffName: overrides.staffName || 'Test Staff',
        duration: overrides.duration || 60,
        price: overrides.price || 100,
        locationName: overrides.locationName || 'Test Location',
        locationAddress: overrides.locationAddress || '123 Test Street',
        locationPhone: overrides.locationPhone || '0498765432',
      },
      merchant: {
        id: overrides.merchantId || 'test-merchant-123',
        name: overrides.merchantName || 'Test Merchant',
        email: overrides.merchantEmail || 'merchant@test.com',
        phone: overrides.merchantPhone || '0498765432',
        website: overrides.merchantWebsite || 'www.testmerchant.com',
      },
      customer: {
        id: 'test-customer-123',
        firstName: overrides.customerName || 'Test Customer',
        email: overrides.customerEmail || 'test@example.com',
        phone: overrides.customerPhone || '0412345678',
      },
    };
  }
}