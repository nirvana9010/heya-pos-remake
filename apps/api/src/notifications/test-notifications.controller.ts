import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
// Swagger imports removed - not installed in this project
import { NotificationsService } from "./notifications.service";
import { EmailProviderFactory } from "./email/email-provider.factory";
import { SmsProviderFactory } from "./sms/sms-provider.factory";
import {
  NotificationType,
  NotificationContext,
} from "./interfaces/notification.interface";
import { NotificationDashboard } from "./mocks/notification-mocks";
import { MerchantNotificationsService } from "./merchant-notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SimpleSchedulerService } from "./simple-scheduler.service";

/**
 * Test controller for notification development and testing
 * Only available in development/test environments
 * Remove or disable in production
 */
@Controller("test/notifications")
export class TestNotificationsController {
  private dashboard: NotificationDashboard;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailProviderFactory: EmailProviderFactory,
    private readonly smsProviderFactory: SmsProviderFactory,
    private readonly merchantNotificationsService: MerchantNotificationsService,
    private readonly prisma: PrismaService,
    private readonly simpleSchedulerService: SimpleSchedulerService,
  ) {
    this.dashboard = NotificationDashboard.getInstance();
  }

  @Post("send-test")
  @HttpCode(HttpStatus.OK)
  async sendTestNotification(
    @Body()
    body: {
      type: NotificationType;
      channel?: "email" | "sms" | "both";
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
      bookingId?: string;
    },
  ) {
    // Build test context
    const testContext: NotificationContext = {
      booking: {
        id: body.bookingId || "test-booking-123",
        bookingNumber: "BK-TEST-001",
        date: new Date(),
        time: "14:00",
        serviceName: "Test Service",
        staffName: "Test Staff",
        duration: 60,
        price: 100,
        locationName: "Test Location",
        locationAddress: "123 Test Street, Test City",
        locationPhone: "0498765432",
      },
      merchant: {
        id: "test-merchant-123",
        name: "Test Merchant",
        email: "merchant@test.com",
        phone: "0498765432",
        website: "www.testmerchant.com",
        address: "123 Test Street, Test Suburb, NSW, 2000",
      },
      customer: {
        id: "test-customer-123",
        firstName: body.customerName || "Test Customer",
        email: body.customerEmail || "test@example.com",
        phone: body.customerPhone || "0412345678",
      },
    };

    const channel = body.channel || "both";
    const results: any = {};

    // Send email if requested
    if (channel === "email" || channel === "both") {
      try {
        const emailService = this.emailProviderFactory.getProvider();
        results.email = await emailService.sendNotification(
          body.type,
          testContext,
        );
      } catch (error: any) {
        results.email = {
          success: false,
          error: error.message,
          channel: "email",
        };
      }
    }

    // Send SMS if requested
    if (channel === "sms" || channel === "both") {
      try {
        const smsService = this.smsProviderFactory.getProvider();
        results.sms = await smsService.sendNotification(body.type, testContext);
      } catch (error: any) {
        results.sms = {
          success: false,
          error: error.message,
          channel: "sms",
        };
      }
    }

    return {
      testMode: true,
      context: testContext,
      results,
      dashboard: {
        stats: this.dashboard.getStats(),
        viewUrl: "/api/test/notifications/dashboard",
      },
    };
  }

  @Post("send-booking/:bookingId")
  @HttpCode(HttpStatus.OK)
  async sendBookingNotification(
    @Param("bookingId") bookingId: string,
    @Body() body: { type: string },
  ) {
    try {
      // For testing, create a mock context
      const testContext: NotificationContext = {
        booking: {
          id: bookingId,
          bookingNumber: "TEST-" + bookingId,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          time: "14:00",
          serviceName: "Test Service",
          staffName: "Test Staff",
          duration: 60,
          price: 100,
          locationName: "Test Location",
          locationAddress: "123 Test St",
          locationPhone: "0412345678",
        },
        merchant: {
          id: "test-merchant",
          name: "Test Merchant",
          email: "merchant@test.com",
          phone: "0412345678",
          website: "www.testmerchant.com",
          address: "123 Test Street, Test Suburb, NSW, 2000",
        },
        customer: {
          id: "test-customer",
          firstName: "Test Customer",
          email: "customer@test.com",
          phone: "0487654321",
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
          viewUrl: "/api/test/notifications/dashboard",
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

  @Get("dashboard")
  async getDashboard() {
    const stats = this.dashboard.getStats();
    const recentNotifications = this.dashboard.getNotifications().slice(-20);

    return {
      stats,
      recentNotifications: recentNotifications.map((n) => ({
        ...n,
        timestamp: n.timestamp.toISOString(),
      })),
      testEndpoints: {
        sendTest: "/api/test/notifications/send-test",
        sendBooking: "/api/test/notifications/send-booking/{bookingId}",
        clearDashboard: "/api/test/notifications/dashboard/clear",
      },
    };
  }

  @Post("dashboard/clear")
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearDashboard() {
    this.dashboard.clearNotifications();
  }

  @Post("merchant-notification")
  @HttpCode(HttpStatus.OK)
  async createTestMerchantNotification(
    @Body()
    body: {
      merchantId: string;
      type?:
        | "booking_new"
        | "booking_cancelled"
        | "booking_modified"
        | "payment_refunded";
      title?: string;
      message?: string;
    },
  ) {
    const notification =
      await this.merchantNotificationsService.createNotification(
        body.merchantId,
        {
          type: body.type || "booking_new",
          priority: "important",
          title: body.title || "Test Notification",
          message: body.message || "This is a test notification from API",
          actionUrl: "/bookings/test-123",
          actionLabel: "View booking",
          metadata: {
            bookingId: "test-123",
            customerName: "Test Customer",
            serviceName: "Test Service",
            testNotification: true,
          },
        },
      );

    return {
      success: true,
      notification,
      sseInfo: "Check SSE stream for real-time update",
    };
  }

  @Post("staff-notification")
  @HttpCode(HttpStatus.OK)
  async testStaffNotification(
    @Body() dto: { type: "new_booking" | "cancellation"; merchantId: string },
  ) {
    try {
      // Get merchant details
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: dto.merchantId },
      });

      if (!merchant) {
        throw new BadRequestException("Merchant not found");
      }

      const merchantSettings = merchant.settings as any;
      let panelNotification = null;
      let emailResult = null;
      let smsResult = null;

      // Create test context for staff notifications
      const testContext = {
        booking: {
          id: "test-booking-id",
          bookingNumber:
            "TEST-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          time: "2:00 PM",
          serviceName: "Test Service",
          staffName: "Test Staff",
          duration: 60,
          price: 100,
          locationName: "Test Location",
        },
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          phone: merchant.phone,
          website: merchant.website,
        },
        // For staff notifications, use hardcoded test values
        customer: {
          id: merchant.id,
          email: "lukas.tn90@gmail.com",
          phone: "+61422627624",
          firstName: merchant.name,
          lastName: "",
          preferredChannel: "both" as const,
        },
      };

      if (dto.type === "new_booking") {
        // Panel notification
        if (merchantSettings?.newBookingNotification !== false) {
          panelNotification =
            await this.merchantNotificationsService.createNotification(
              dto.merchantId,
              {
                type: "booking_new",
                priority: "urgent",
                title: "New Booking",
                message:
                  "Test Customer booked Test Service for tomorrow at 2:00 PM",
                actionUrl: "/calendar",
                actionLabel: "View Booking",
                metadata: {
                  bookingId: "test-booking-id",
                  customerName: "Test Customer",
                  serviceName: "Test Service",
                  startTime: new Date(
                    Date.now() + 24 * 60 * 60 * 1000,
                  ).toISOString(),
                },
              },
            );
        }

        // Email/SMS notifications
        const shouldSendEmail =
          merchantSettings?.newBookingNotificationEmail !== false;
        const shouldSendSms =
          merchantSettings?.newBookingNotificationSms !== false;

        if (shouldSendEmail || shouldSendSms) {
          const staffContext = {
            ...testContext,
            customer: {
              ...testContext.customer,
              preferredChannel: this.determineMerchantPreferredChannel(
                "both",
                shouldSendEmail,
                shouldSendSms,
              ),
            },
          };

          const results = await this.notificationsService.sendNotification(
            NotificationType.BOOKING_NEW_STAFF,
            staffContext,
          );

          emailResult = results.email;
          smsResult = results.sms;
        }

        return {
          success: true,
          message: "New booking notifications sent",
          results: {
            panel: panelNotification
              ? { success: true, message: "Panel notification created" }
              : { success: false, message: "Panel notifications disabled" },
            email: emailResult || {
              success: false,
              message: "Email notifications disabled",
            },
            sms: smsResult || {
              success: false,
              message: "SMS notifications disabled",
            },
          },
        };
      } else if (dto.type === "cancellation") {
        // Panel notification
        if (merchantSettings?.cancellationNotification !== false) {
          panelNotification =
            await this.merchantNotificationsService.createNotification(
              dto.merchantId,
              {
                type: "booking_cancelled",
                priority: "important",
                title: "Booking Cancelled",
                message:
                  "Test Customer cancelled their appointment for Test Service",
                actionUrl: "/calendar",
                actionLabel: "View Calendar",
                metadata: {
                  bookingId: "test-booking-id",
                  customerName: "Test Customer",
                  serviceName: "Test Service",
                  startTime: new Date(
                    Date.now() + 24 * 60 * 60 * 1000,
                  ).toISOString(),
                },
              },
            );
        }

        // Email/SMS notifications
        const shouldSendEmail =
          merchantSettings?.cancellationNotificationEmail !== false;
        const shouldSendSms =
          merchantSettings?.cancellationNotificationSms !== false;

        if (shouldSendEmail || shouldSendSms) {
          const staffContext = {
            ...testContext,
            customer: {
              ...testContext.customer,
              preferredChannel: this.determineMerchantPreferredChannel(
                "both",
                shouldSendEmail,
                shouldSendSms,
              ),
            },
          };

          const results = await this.notificationsService.sendNotification(
            NotificationType.BOOKING_CANCELLED_STAFF,
            staffContext,
          );

          emailResult = results.email;
          smsResult = results.sms;
        }

        return {
          success: true,
          message: "Cancellation notifications sent",
          results: {
            panel: panelNotification
              ? { success: true, message: "Panel notification created" }
              : { success: false, message: "Panel notifications disabled" },
            email: emailResult || {
              success: false,
              message: "Email notifications disabled",
            },
            sms: smsResult || {
              success: false,
              message: "SMS notifications disabled",
            },
          },
        };
      }

      throw new BadRequestException("Invalid notification type");
    } catch (error: any) {
      console.error("Staff notification test error:", error);
      throw new BadRequestException(
        error.message || "Failed to send staff notification",
      );
    }
  }

  @Get("verify-connections")
  async verifyConnections() {
    const emailService = this.emailProviderFactory.getProvider();
    const emailConnection = await emailService.verifyConnection();
    const smsConnection = true; // SMS mock always returns true

    return {
      email: {
        connected: emailConnection,
        provider: process.env.USE_MOCKS ? "mock-smtp" : "smtp",
        mockMode: process.env.USE_MOCKS === "true",
      },
      sms: {
        connected: smsConnection,
        provider: process.env.USE_MOCKS ? "mock-twilio" : "twilio",
        mockMode: process.env.USE_MOCKS === "true",
      },
    };
  }

  @Post("test-scenarios/:scenario")
  @HttpCode(HttpStatus.OK)
  async runTestScenario(@Param("scenario") scenario: string) {
    const scenarios = {
      "email-failure": {
        context: this.buildTestContext({
          customerEmail: "fail@test.com",
        }),
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: "email",
        expectedResult: "Email should fail with invalid recipient error",
      },
      "sms-failure": {
        context: this.buildTestContext({
          customerPhone: "0400000000",
        }),
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: "sms",
        expectedResult: "SMS should fail with undeliverable error",
      },
      "bounce-email": {
        context: this.buildTestContext({
          customerEmail: "bounce@test.com",
        }),
        type: NotificationType.BOOKING_REMINDER_24H,
        channel: "email",
        expectedResult: "Email should bounce",
      },
      "invalid-phone": {
        context: this.buildTestContext({
          customerPhone: "123",
        }),
        type: NotificationType.BOOKING_REMINDER_2H,
        channel: "sms",
        expectedResult: "SMS should fail with invalid phone number",
      },
      "long-sms": {
        context: this.buildTestContext({
          serviceName: "A".repeat(200),
        }),
        type: NotificationType.BOOKING_CONFIRMATION,
        channel: "sms",
        expectedResult: "SMS should handle long message",
      },
      "missing-email": {
        context: this.buildTestContext({
          customerEmail: "",
        }),
        type: NotificationType.BOOKING_CANCELLED,
        channel: "email",
        expectedResult: "Email should fail with missing email error",
      },
      "missing-phone": {
        context: this.buildTestContext({
          customerPhone: "",
        }),
        type: NotificationType.BOOKING_RESCHEDULED,
        channel: "sms",
        expectedResult: "SMS should fail with missing phone error",
      },
    };

    const testScenario = scenarios[scenario];
    if (!testScenario) {
      return {
        error: "Invalid scenario",
        availableScenarios: Object.keys(scenarios),
      };
    }

    let result;
    try {
      if (testScenario.channel === "email") {
        const emailService = this.emailProviderFactory.getProvider();
        result = await emailService.sendNotification(
          testScenario.type,
          testScenario.context,
        );
      } else {
        const smsService = this.smsProviderFactory.getProvider();
        result = await smsService.sendNotification(
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

  @Post("test-reminder/:type")
  @HttpCode(HttpStatus.OK)
  async testReminder(
    @Param("type") type: "24h" | "2h",
    @Body()
    body: {
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
      merchantId?: string;
    },
  ) {
    // Send a test reminder immediately
    const reminderType =
      type === "24h"
        ? NotificationType.BOOKING_REMINDER_24H
        : NotificationType.BOOKING_REMINDER_2H;

    // Get merchant settings if merchantId provided
    let merchantSettings: any = {};
    if (body.merchantId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: body.merchantId },
        select: { settings: true },
      });
      merchantSettings = merchant?.settings || {};
    }

    // Check merchant settings for reminder preferences
    let shouldSendEmail = true;
    let shouldSendSms = true;

    if (type === "24h") {
      shouldSendEmail = merchantSettings?.appointmentReminder24hEmail !== false;
      shouldSendSms = merchantSettings?.appointmentReminder24hSms !== false;
    } else if (type === "2h") {
      shouldSendEmail = merchantSettings?.appointmentReminder2hEmail !== false;
      shouldSendSms = merchantSettings?.appointmentReminder2hSms !== false;
    }

    // Build context with merchant preferences
    const testContext = this.buildTestContext({
      customerEmail: body.customerEmail || "test@example.com",
      customerPhone: body.customerPhone || "0412345678",
      customerName: body.customerName || "Test Customer",
      merchantId: body.merchantId,
      date: new Date(
        Date.now() +
          (type === "24h" ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000),
      ),
    });

    // Override customer preferences based on merchant settings
    const preferredChannel = this.determineMerchantPreferredChannel(
      testContext.customer.preferredChannel || "both",
      shouldSendEmail,
      shouldSendSms,
    );
    testContext.customer.preferredChannel = preferredChannel;

    const results = await this.notificationsService.sendNotification(
      reminderType,
      testContext,
    );

    return {
      testMode: true,
      reminderType: type,
      scheduledFor: testContext.booking.date,
      results,
      merchantSettings: {
        emailEnabled: shouldSendEmail,
        smsEnabled: shouldSendSms,
      },
      message: `Test ${type} reminder sent immediately (simulating scheduled reminder)`,
    };
  }

  @Post("force-process-reminders")
  @HttpCode(HttpStatus.OK)
  async forceProcessReminders() {
    // Manually trigger the scheduler to process pending reminders
    await this.simpleSchedulerService.processScheduledNotifications();

    return {
      success: true,
      message: "Forced scheduler to process pending notifications",
      note: "Check API logs for processing details",
    };
  }

  private buildTestContext(overrides: any = {}): NotificationContext {
    return {
      booking: {
        id: overrides.bookingId || "test-booking-123",
        bookingNumber: overrides.bookingNumber || "BK-TEST-001",
        date: overrides.date || new Date(),
        time: overrides.time || "14:00",
        serviceName: overrides.serviceName || "Test Service",
        staffName: overrides.staffName || "Test Staff",
        duration: overrides.duration || 60,
        price: overrides.price || 100,
        locationName: overrides.locationName || "Test Location",
        locationAddress: overrides.locationAddress || "123 Test Street",
        locationPhone: overrides.locationPhone || "0498765432",
      },
      merchant: {
        id: overrides.merchantId || "test-merchant-123",
        name: overrides.merchantName || "Test Merchant",
        email: overrides.merchantEmail || "merchant@test.com",
        phone: overrides.merchantPhone || "0498765432",
        website: overrides.merchantWebsite || "www.testmerchant.com",
        address:
          overrides.merchantAddress ||
          "123 Test Street, Test Suburb, NSW, 2000",
      },
      customer: {
        id: "test-customer-123",
        firstName: overrides.customerName || "Test Customer",
        email: overrides.customerEmail || "test@example.com",
        phone: overrides.customerPhone || "0412345678",
      },
    };
  }

  private determineMerchantPreferredChannel(
    customerPreference: "email" | "sms" | "both",
    emailEnabled: boolean,
    smsEnabled: boolean,
  ): "email" | "sms" | "both" {
    // If merchant has disabled both channels, return 'both' to skip sending
    if (!emailEnabled && !smsEnabled) {
      return "both"; // This will result in no notifications being sent
    }

    // If only one channel is enabled by merchant, use that
    if (emailEnabled && !smsEnabled) {
      return "email";
    }
    if (!emailEnabled && smsEnabled) {
      return "sms";
    }

    // Both channels are enabled by merchant, respect customer preference
    return customerPreference;
  }
}
