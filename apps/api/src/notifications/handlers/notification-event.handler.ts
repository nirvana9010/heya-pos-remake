import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BookingCreatedEvent } from "../../contexts/bookings/domain/events/booking-created.event";
import { NotificationsService } from "../notifications.service";
import { MerchantNotificationsService } from "../merchant-notifications.service";
import { NotificationType } from "../interfaces/notification.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";

@Injectable()
export class NotificationEventHandler {
  private readonly logger = new Logger(NotificationEventHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly merchantNotificationsService: MerchantNotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent("booking.confirmed")
  async handleBookingConfirmed(event: any): Promise<void> {
    try {
      this.logger.log(
        `[${new Date().toISOString()}] ====== BOOKING CONFIRMED HANDLER TRIGGERED ======`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] 🎯 CONFIRMATION EMAIL HANDLER ACTIVATED`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Raw event data:`,
        JSON.stringify(event, null, 2),
      );

      const bookingId = event.bookingId || event.aggregateId;
      if (!bookingId) {
        this.logger.error(
          `[${new Date().toISOString()}] ❌ NO BOOKING ID FOUND IN EVENT`,
        );
        return;
      }

      this.logger.log(
        `[${new Date().toISOString()}] 📧 Processing confirmation email for booking: ${bookingId}`,
      );

      // Fetch full booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
                take: 1,
                orderBy: { createdAt: "asc" }, // Get the primary/first location
              },
            },
          },
          provider: true,
          services: {
            include: {
              service: true,
              staff: true,
            },
          },
          location: true,
        },
      });

      if (!booking) {
        this.logger.error(
          `[${new Date().toISOString()}] ❌ BOOKING NOT FOUND: ${bookingId}`,
        );
        return;
      }

      this.logger.log(`[${new Date().toISOString()}] ✅ Booking found:`, {
        id: booking.id,
        status: booking.status,
        confirmedAt: booking.confirmedAt,
        customerEmail: booking.customer?.email,
        merchantName: booking.merchant?.name,
      });

      // Prepare notification context
      const serviceSummary = this.buildServiceSummary(booking.services);
      const customerName = booking.customer
        ? booking.customer.lastName
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName || booking.customer.email || "Customer"
        : "Customer";
      const customerPhone = booking.customer?.phone || "";
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          serviceName: serviceSummary.combinedName,
          staffName: serviceSummary.staffName,
          duration: serviceSummary.totalDuration,
          price: Number(booking.totalAmount),
          services: serviceSummary.services,
          locationName: booking.location?.name || "",
          locationAddress: booking.location?.address || "",
          locationPhone: booking.location?.phone || "",
          customerName,
          customerPhone,
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          address: booking.merchant.locations?.[0]
            ? [
                booking.merchant.locations[0].address,
                booking.merchant.locations[0].suburb,
                booking.merchant.locations[0].state,
                booking.merchant.locations[0].postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : "",
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as
            | "email"
            | "sms"
            | "both",
        },
      };

      // Check merchant settings for confirmation emails
      const merchantSettings = booking.merchant.settings as any;
      const shouldSendEmail =
        merchantSettings?.bookingConfirmationEmail !== false; // Default to true
      const shouldSendSms = merchantSettings?.bookingConfirmationSms !== false; // Default to true

      this.logger.log(
        `[${new Date().toISOString()}] 📧 ====== CONFIRMATION EMAIL DECISION ======`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Should send email: ${shouldSendEmail}`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Should send SMS: ${shouldSendSms}`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Merchant settings snapshot:`,
        merchantSettings,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Customer email: ${context.customer.email}`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Customer preferred channel: ${context.customer.preferredChannel}`,
      );

      if (shouldSendEmail || shouldSendSms) {
        this.logger.log(
          `[${new Date().toISOString()}] 📤 SENDING CONFIRMATION NOTIFICATION...`,
        );
        // Override context to respect merchant settings
        const notificationContext = {
          ...context,
          customer: {
            ...context.customer,
            preferredChannel: this.determineMerchantPreferredChannel(
              context.customer.preferredChannel,
              shouldSendEmail,
              shouldSendSms,
            ),
          },
        };

        // Send booking confirmation
        this.logger.log(
          `[${new Date().toISOString()}] 📮 Calling sendNotification with type: ${NotificationType.BOOKING_CONFIRMATION}`,
        );
        const results = await this.notificationsService.sendNotification(
          NotificationType.BOOKING_CONFIRMATION,
          notificationContext,
        );

        this.logger.log(
          `[${new Date().toISOString()}] ✉️ CONFIRMATION EMAIL RESULT:`,
          {
            emailSent: results.email?.success,
            emailError: results.email?.error,
            smsSent: results.sms?.success,
            smsError: results.sms?.error,
          },
        );

        if (results.email?.success) {
          this.logger.log(
            `[${new Date().toISOString()}] ✅ CONFIRMATION EMAIL SENT SUCCESSFULLY to ${context.customer.email}`,
          );
        } else {
          this.logger.error(
            `[${new Date().toISOString()}] ❌ CONFIRMATION EMAIL FAILED: ${results.email?.error || "Unknown error"}`,
          );
        }
      } else {
        this.logger.log(
          `Booking confirmation skipped - merchant has disabled all notification channels`,
        );
      }

      // Schedule reminders (if enabled) - same as in booking created
      await this.scheduleReminders(
        booking.id,
        booking.startTime,
        booking.merchant.settings as any,
      );
    } catch (error) {
      const fallbackBookingId = event.bookingId || event.aggregateId;
      this.logger.error(
        `Failed to handle booking confirmed event: ${fallbackBookingId}`,
        error,
      );
    }
  }

  @OnEvent("booking.customer_changed")
  async handleBookingCustomerChanged(event: {
    bookingId?: string;
    aggregateId?: string;
    previousCustomerId?: string;
    newCustomerId?: string;
    orderId?: string | null;
  }): Promise<void> {
    const bookingId = event.bookingId || event.aggregateId;
    if (!bookingId) {
      this.logger.error("booking.customer_changed received without bookingId");
      return;
    }

    this.logger.log(
      `[${new Date().toISOString()}] Handling customer change for booking ${bookingId}`,
    );

    const [booking, previousCustomer] = await Promise.all([
      this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
                take: 1,
                orderBy: { createdAt: "asc" },
              },
            },
          },
          provider: true,
          services: {
            include: {
              service: true,
              staff: true,
            },
          },
          location: true,
        },
      }),
      event.previousCustomerId
        ? this.prisma.customer.findUnique({
            where: { id: event.previousCustomerId },
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          })
        : null,
    ]);

    if (!booking) {
      this.logger.error(
        `Booking not found while handling customer change: ${bookingId}`,
      );
      return;
    }

    const serviceSummary = this.buildServiceSummary(booking.services);
    const newCustomerName = booking.customer
      ? booking.customer.lastName
        ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
        : booking.customer.firstName || booking.customer.email || "Customer"
      : "Customer";

    const previousCustomerName = previousCustomer
      ? previousCustomer.lastName
        ? `${previousCustomer.firstName} ${previousCustomer.lastName}`.trim()
        : previousCustomer.firstName || previousCustomer.email || "Customer"
      : "previous customer";

    const changeDescription = `changed customer from ${previousCustomerName} to ${newCustomerName}`;

    await this.merchantNotificationsService.createBookingNotification(
      booking.merchantId,
      "booking_modified",
      {
        id: booking.id,
        customerName: newCustomerName,
        serviceName: serviceSummary.combinedName,
        startTime: booking.startTime,
        staffName: serviceSummary.staffName,
      },
      changeDescription,
    );

    const merchantSettings = booking.merchant
      .settings as Prisma.JsonValue as Record<string, any>;
    const shouldSendEmail =
      merchantSettings?.bookingConfirmationEmail !== false;
    const shouldSendSms = merchantSettings?.bookingConfirmationSms !== false;

    if (booking.status === "CONFIRMED" && (shouldSendEmail || shouldSendSms)) {
      const customerPhone = booking.customer?.phone || "";
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          serviceName: serviceSummary.combinedName,
          staffName: serviceSummary.staffName,
          duration: serviceSummary.totalDuration,
          price: Number(booking.totalAmount),
          services: serviceSummary.services,
          locationName: booking.location?.name || "",
          locationAddress: booking.location?.address || "",
          locationPhone: booking.location?.phone || "",
          customerName: newCustomerName,
          customerPhone,
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          address: booking.merchant.locations?.[0]
            ? [
                booking.merchant.locations[0].address,
                booking.merchant.locations[0].suburb,
                booking.merchant.locations[0].state,
                booking.merchant.locations[0].postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : "",
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as
            | "email"
            | "sms"
            | "both",
        },
      };

      const notificationContext = {
        ...context,
        customer: {
          ...context.customer,
          preferredChannel: this.determineMerchantPreferredChannel(
            context.customer.preferredChannel,
            shouldSendEmail,
            shouldSendSms,
          ),
        },
      };

      this.logger.log(
        `[${new Date().toISOString()}] Sending refreshed confirmation to ${newCustomerName} after customer change`,
      );
      await this.notificationsService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        notificationContext,
      );
    } else {
      this.logger.log(
        `[${new Date().toISOString()}] Skipping confirmation resend (status: ${booking.status}, emailEnabled: ${shouldSendEmail}, smsEnabled: ${shouldSendSms})`,
      );
    }
  }

  @OnEvent("booking.created")
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    try {
      this.logger.log(
        `[${new Date().toISOString()}] ====== BOOKING CREATED EVENT RECEIVED ======`,
      );
      this.logger.log(
        `[${new Date().toISOString()}] Handling booking created event: ${event.bookingId}, source: ${event.source}`,
      );

      // Fetch full booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: event.bookingId },
        include: {
          customer: true,
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
                take: 1,
                orderBy: { createdAt: "asc" }, // Get the primary/first location
              },
            },
          },
          provider: true,
          services: {
            include: {
              service: true,
              staff: true,
            },
          },
          location: true,
        },
      });

      if (!booking) {
        this.logger.error(`Booking not found: ${event.bookingId}`);
        return;
      }

      // Prepare notification context with all booked services
      const serviceSummary = this.buildServiceSummary(booking.services);
      const customerName = booking.customer
        ? booking.customer.lastName
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName || booking.customer.email || "Customer"
        : "Customer";
      const customerPhone = booking.customer?.phone || "";
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          serviceName: serviceSummary.combinedName,
          staffName: serviceSummary.staffName,
          duration: serviceSummary.totalDuration,
          price: Number(booking.totalAmount),
          services: serviceSummary.services,
          locationName: booking.location?.name || "",
          locationAddress: booking.location?.address || "",
          locationPhone: booking.location?.phone || "",
          customerName,
          customerPhone,
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          // Include primary location full address if available
          address: booking.merchant.locations?.[0]
            ? [
                booking.merchant.locations[0].address,
                booking.merchant.locations[0].suburb,
                booking.merchant.locations[0].state,
                booking.merchant.locations[0].postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : "",
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as
            | "email"
            | "sms"
            | "both",
        },
      };

      // Note: Customer booking confirmations are now handled by the booking.confirmed event
      // This prevents duplicate SMS/email confirmations when a booking is auto-confirmed
      const merchantSettings = booking.merchant.settings as any;

      this.logger.log(
        `[${new Date().toISOString()}] ====== BOOKING CREATED - NO CUSTOMER CONFIRMATIONS ======`,
      );
      this.logger.log(`Booking ${booking.id} status: ${booking.status}`);
      this.logger.log(
        `Customer confirmations will be sent via booking.confirmed event to avoid duplicates`,
      );

      // Create merchant notification only for external bookings (from booking app) and if enabled
      if (event.source === "ONLINE") {
        // Panel notification
        if (merchantSettings?.newBookingNotification !== false) {
          this.logger.log(
            `[${new Date().toISOString()}] ====== CREATING MERCHANT NOTIFICATION ======`,
          );
          this.logger.log(
            `[${new Date().toISOString()}] Creating merchant notification for ONLINE booking ${booking.id}`,
          );
          await this.merchantNotificationsService.createBookingNotification(
            booking.merchantId,
            "booking_new",
            {
              id: booking.id,
              customerName,
              serviceName: serviceSummary.combinedName,
              startTime: booking.startTime,
              staffName: serviceSummary.staffName,
            },
          );
          this.logger.log(
            `[${new Date().toISOString()}] Merchant notification created for booking ${booking.id}`,
          );
        }

        // Email/SMS notifications for staff
        const shouldSendStaffEmail =
          merchantSettings?.newBookingNotificationEmail !== false;
        const shouldSendStaffSms =
          merchantSettings?.newBookingNotificationSms !== false;

        if (shouldSendStaffEmail || shouldSendStaffSms) {
          const staffContext = {
            ...context,
            // Override customer info with merchant info for staff notifications
            customer: {
              id: booking.merchant.id,
              email: booking.merchant.email,
              phone: booking.merchant.phone,
              firstName: booking.merchant.name,
              lastName: "",
              preferredChannel: this.determineMerchantPreferredChannel(
                "both",
                shouldSendStaffEmail,
                shouldSendStaffSms,
              ),
            },
          };

          // Send staff notification for new booking
          const results = await this.notificationsService.sendNotification(
            NotificationType.BOOKING_NEW_STAFF,
            staffContext,
          );

          this.logger.log(
            `Staff new booking notification sent - Email: ${results.email?.success}, SMS: ${results.sms?.success}`,
          );
        }
      } else {
        this.logger.log(
          `[${new Date().toISOString()}] Skipping merchant notification for ${event.source} booking ${booking.id}`,
        );
      }

      // Schedule reminders (if enabled)
      await this.scheduleReminders(
        booking.id,
        booking.startTime,
        booking.merchant.settings as any,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking created event: ${event.bookingId}`,
        error,
      );
    }
  }

  private async scheduleReminders(
    bookingId: string,
    startTime: Date,
    merchantSettings: any,
  ): Promise<void> {
    try {
      // For MVP, we'll create scheduled jobs in the database
      // In production, use a proper job queue (Bull/BullMQ)

      const now = new Date();
      const reminder24h = new Date(startTime);
      reminder24h.setHours(reminder24h.getHours() - 24);

      const reminder2h = new Date(startTime);
      reminder2h.setHours(reminder2h.getHours() - 2);

      // Check if 24h reminders are enabled (default to true if not set)
      const should24hEmail =
        merchantSettings?.appointmentReminder24hEmail !== false;
      const should24hSms =
        merchantSettings?.appointmentReminder24hSms !== false;

      // Only schedule 24h reminder if in the future and at least one channel is enabled
      if (reminder24h > now && (should24hEmail || should24hSms)) {
        await this.prisma.scheduledNotification.create({
          data: {
            bookingId,
            type: NotificationType.BOOKING_REMINDER_24H,
            scheduledFor: reminder24h,
            status: "pending",
          },
        });
        this.logger.log(`Scheduled 24h reminder for booking ${bookingId}`);
      }

      // Check if 2h reminders are enabled (default to true if not set)
      const should2hEmail =
        merchantSettings?.appointmentReminder2hEmail !== false;
      const should2hSms = merchantSettings?.appointmentReminder2hSms !== false;

      // Only schedule 2h reminder if in the future and at least one channel is enabled
      if (reminder2h > now && (should2hEmail || should2hSms)) {
        await this.prisma.scheduledNotification.create({
          data: {
            bookingId,
            type: NotificationType.BOOKING_REMINDER_2H,
            scheduledFor: reminder2h,
            status: "pending",
          },
        });
        this.logger.log(`Scheduled 2h reminder for booking ${bookingId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to schedule reminders for booking ${bookingId}`,
        error,
      );
    }
  }

  @OnEvent("booking.cancelled")
  async handleBookingCancelled(event: {
    bookingId: string;
    source?: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling booking cancelled event: ${event.bookingId}, source: ${event.source}`,
      );

      // Fetch booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: event.bookingId },
        include: {
          customer: true,
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
                take: 1,
                orderBy: { createdAt: "asc" }, // Get the primary/first location
              },
            },
          },
          provider: true,
          services: {
            include: {
              service: true,
              staff: true,
            },
          },
          location: true,
        },
      });

      if (!booking) {
        this.logger.error(`Booking not found: ${event.bookingId}`);
        return;
      }

      // Prepare notification context with all booked services
      const serviceSummary = this.buildServiceSummary(booking.services);
      const customerName = booking.customer
        ? booking.customer.lastName
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName || booking.customer.email || "Customer"
        : "Customer";
      const customerPhone = booking.customer?.phone || "";
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          serviceName: serviceSummary.combinedName,
          staffName: serviceSummary.staffName,
          duration: serviceSummary.totalDuration,
          price: Number(booking.totalAmount),
          services: serviceSummary.services,
          locationName: booking.location?.name || "",
          locationAddress: booking.location?.address || "",
          locationPhone: booking.location?.phone || "",
          customerName,
          customerPhone,
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          // Include primary location full address if available
          address: booking.merchant.locations?.[0]
            ? [
                booking.merchant.locations[0].address,
                booking.merchant.locations[0].suburb,
                booking.merchant.locations[0].state,
                booking.merchant.locations[0].postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : "",
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as
            | "email"
            | "sms"
            | "both",
        },
      };

      // Send cancellation notification
      const results = await this.notificationsService.sendNotification(
        NotificationType.BOOKING_CANCELLED,
        context,
      );

      this.logger.log(
        `Booking cancellation sent - Email: ${results.email?.success}, SMS: ${results.sms?.success}`,
      );

      // Create merchant notification only for external bookings and if enabled
      const merchantSettings = booking.merchant.settings as any;
      if (event.source === "ONLINE") {
        // Panel notification
        if (merchantSettings?.cancellationNotification !== false) {
          await this.merchantNotificationsService.createBookingNotification(
            booking.merchantId,
            "booking_cancelled",
            {
              id: booking.id,
              customerName,
              serviceName: serviceSummary.combinedName,
              startTime: booking.startTime,
              staffName: serviceSummary.staffName,
            },
          );
        }

        // Email/SMS notifications for staff
        const shouldSendStaffEmail =
          merchantSettings?.cancellationNotificationEmail !== false;
        const shouldSendStaffSms =
          merchantSettings?.cancellationNotificationSms !== false;

        if (shouldSendStaffEmail || shouldSendStaffSms) {
          const staffContext = {
            ...context,
            // Override customer info with merchant info for staff notifications
            customer: {
              id: booking.merchant.id,
              email: booking.merchant.email,
              phone: booking.merchant.phone,
              firstName: booking.merchant.name,
              lastName: "",
              preferredChannel: this.determineMerchantPreferredChannel(
                "both",
                shouldSendStaffEmail,
                shouldSendStaffSms,
              ),
            },
          };

          // Send staff notification for cancellation
          const results = await this.notificationsService.sendNotification(
            NotificationType.BOOKING_CANCELLED_STAFF,
            staffContext,
          );

          this.logger.log(
            `Staff cancellation notification sent - Email: ${results.email?.success}, SMS: ${results.sms?.success}`,
          );
        }
      } else {
        this.logger.log(
          `Skipping merchant notification for ${event.source || "unknown"} cancelled booking ${booking.id}`,
        );
      }

      // Cancel any pending reminders
      await this.cancelReminders(booking.id);
    } catch (error) {
      this.logger.error(
        `Failed to handle booking cancelled event: ${event.bookingId}`,
        error,
      );
    }
  }

  private async cancelReminders(bookingId: string): Promise<void> {
    try {
      await this.prisma.scheduledNotification.updateMany({
        where: {
          bookingId,
          status: "pending",
        },
        data: {
          status: "cancelled",
        },
      });
      this.logger.log(`Cancelled pending reminders for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel reminders for booking ${bookingId}`,
        error,
      );
    }
  }

  @OnEvent("booking.rescheduled")
  async handleBookingRescheduled(event: {
    bookingId: string;
    oldStartTime?: Date | string;
    newStartTime?: Date | string;
    oldEndTime?: Date | string;
    newEndTime?: Date | string;
    source?: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `[${new Date().toISOString()}] Handling booking rescheduled event:`,
        {
          bookingId: event.bookingId,
          oldStartTime: event.oldStartTime,
          newStartTime: event.newStartTime,
          source: event.source,
        },
      );

      // Fetch booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: event.bookingId },
        include: {
          customer: true,
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
                take: 1,
                orderBy: { createdAt: "asc" }, // Get the primary/first location
              },
            },
          },
          provider: true,
          services: {
            include: {
              service: true,
              staff: true,
            },
          },
          location: true,
        },
      });

      if (!booking) {
        this.logger.error(`Booking not found: ${event.bookingId}`);
        return;
      }

      const serviceSummary = this.buildServiceSummary(booking.services);
      const customerName = booking.customer
        ? booking.customer.lastName
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName || booking.customer.email || "Customer"
        : "Customer";
      const customerPhone = booking.customer?.phone || "";

      const merchantSettings = booking.merchant.settings as any;

      // Prepare customer notification context
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          serviceName: serviceSummary.combinedName,
          staffName: serviceSummary.staffName,
          duration: serviceSummary.totalDuration,
          price: Number(booking.totalAmount),
          services: serviceSummary.services,
          locationName: booking.location?.name || "",
          locationAddress: booking.location?.address || "",
          locationPhone: booking.location?.phone || "",
          customerName,
          customerPhone,
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          address: booking.merchant.locations?.[0]
            ? [
                booking.merchant.locations[0].address,
                booking.merchant.locations[0].suburb,
                booking.merchant.locations[0].state,
                booking.merchant.locations[0].postalCode,
              ]
                .filter(Boolean)
                .join(", ")
            : "",
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as
            | "email"
            | "sms"
            | "both",
        },
      };

      const shouldSendEmail =
        merchantSettings?.rescheduleNotificationEmail !== false;
      const shouldSendSms =
        merchantSettings?.rescheduleNotificationSms !== false;

      if (shouldSendEmail || shouldSendSms) {
        const notificationContext = {
          ...context,
          customer: {
            ...context.customer,
            preferredChannel: this.determineMerchantPreferredChannel(
              context.customer.preferredChannel,
              shouldSendEmail,
              shouldSendSms,
            ),
          },
        };

        const results = await this.notificationsService.sendNotification(
          NotificationType.BOOKING_RESCHEDULED,
          notificationContext,
        );

        this.logger.log(
          `Booking reschedule notification sent - Email: ${results.email?.success}, SMS: ${results.sms?.success}`,
        );
      } else {
        this.logger.log(
          "Skipping customer reschedule notification - merchant disabled all channels",
        );
      }

      // Create merchant notification only for external bookings
      if (event.source === "ONLINE") {
        this.logger.log(
          `[${new Date().toISOString()}] Creating merchant notification for ONLINE rescheduled booking ${booking.id}`,
        );
        await this.merchantNotificationsService.createBookingNotification(
          booking.merchantId,
          "booking_modified",
          {
            id: booking.id,
            customerName,
            serviceName: serviceSummary.combinedName,
            startTime: booking.startTime,
            staffName: serviceSummary.staffName,
          },
          "has been rescheduled",
        );
        this.logger.log(
          `[${new Date().toISOString()}] Merchant notification created for rescheduled booking ${booking.id}`,
        );
      } else {
        this.logger.log(
          `[${new Date().toISOString()}] Skipping merchant notification for ${event.source || "unknown"} rescheduled booking ${booking.id}`,
        );
      }

      // Cancel old reminders and schedule new ones
      await this.cancelReminders(booking.id);
      if (event.newStartTime) {
        const newStartDate =
          typeof event.newStartTime === "string"
            ? new Date(event.newStartTime)
            : event.newStartTime;
        await this.scheduleReminders(
          booking.id,
          newStartDate,
          booking.merchant.settings as any,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle booking rescheduled event: ${event.bookingId}`,
        error,
      );
    }
  }

  @OnEvent("booking.completed")
  async handleBookingCompleted(event: {
    bookingId: string;
    source?: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling booking completed event: ${event.bookingId}, source: ${event.source}`,
      );

      // Fetch booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: event.bookingId },
        include: {
          customer: true,
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
                take: 1,
                orderBy: { createdAt: "asc" }, // Get the primary/first location
              },
            },
          },
          provider: true,
          services: {
            include: {
              service: true,
              staff: true,
            },
          },
          location: true,
        },
      });

      if (!booking) {
        this.logger.error(`Booking not found: ${event.bookingId}`);
        return;
      }

      // Create merchant notification only for external bookings
      if (event.source === "ONLINE") {
        const customerName = booking.customer.lastName
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
        const serviceSummary = this.buildServiceSummary(booking.services);
        await this.merchantNotificationsService.createBookingNotification(
          booking.merchantId,
          "booking_modified",
          {
            id: booking.id,
            customerName,
            serviceName: serviceSummary.combinedName,
            startTime: booking.startTime,
            staffName: serviceSummary.staffName,
          },
          "completed their appointment",
        );
      } else {
        this.logger.log(
          `Skipping merchant notification for ${event.source || "unknown"} completed booking ${booking.id}`,
        );
      }

      this.logger.log(
        `Booking completed notification created for booking ${event.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking completed event for ${event.bookingId}`,
        error,
      );
    }
  }

  private buildServiceSummary(
    services: Array<{
      service?: { name?: string | null } | null;
      duration?: number | null;
      price?: Prisma.Decimal | number | null;
      staff?: { firstName: string | null; lastName?: string | null } | null;
    }>,
  ): {
    combinedName: string;
    staffName: string;
    totalDuration: number;
    services: {
      name: string;
      duration: number;
      price: number;
      staffName?: string;
    }[];
  } {
    const normalizedServices =
      services?.map(service => {
        const name = service?.service?.name?.trim() || "Service";
        const rawDuration =
          typeof service?.duration === "number"
            ? service.duration
            : Number(service?.duration ?? 0);
        const duration =
          Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
        const priceValue =
          service?.price !== undefined && service?.price !== null
            ? Number(service.price)
            : 0;
        const staffRecord = service?.staff;
        const staffName = staffRecord?.firstName
          ? staffRecord.lastName
            ? `${staffRecord.firstName} ${staffRecord.lastName}`.trim()
            : staffRecord.firstName
          : staffRecord?.lastName || undefined;

        return {
          name,
          duration,
          price: priceValue,
          staffName,
        };
      }) ?? [];

    const filteredServices = normalizedServices.filter(
      svc => svc.name && svc.name.trim().length > 0,
    );

    if (filteredServices.length === 0) {
      return {
        combinedName: "Service",
        staffName: "Staff",
        totalDuration: 60,
        services: [],
      };
    }

    const combinedName = filteredServices.map(svc => svc.name).join(" + ");
    const totalDurationRaw = filteredServices.reduce(
      (sum, svc) => sum + (svc.duration || 0),
      0,
    );
    const totalDuration =
      totalDurationRaw > 0
        ? totalDurationRaw
        : filteredServices[0].duration > 0
          ? filteredServices[0].duration
          : 60;

    const staffNames = filteredServices
      .map(svc => svc.staffName)
      .filter((name): name is string => !!name && name.trim().length > 0);

    const uniqueStaffNames = Array.from(new Set(staffNames));
    const staffName =
      uniqueStaffNames.length === 1
        ? uniqueStaffNames[0]
        : uniqueStaffNames.length > 1
          ? uniqueStaffNames.join(", ")
          : "Staff";

    return {
      combinedName,
      staffName,
      totalDuration,
      services: filteredServices.map(svc => ({
        name: svc.name,
        duration: svc.duration,
        price: svc.price,
        staffName: svc.staffName,
      })),
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
