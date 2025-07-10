import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BookingCreatedEvent } from '../../contexts/bookings/domain/events/booking-created.event';
import { NotificationsService } from '../notifications.service';
import { MerchantNotificationsService } from '../merchant-notifications.service';
import { NotificationType } from '../interfaces/notification.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { format } from 'date-fns';

@Injectable()
export class NotificationEventHandler {
  private readonly logger = new Logger(NotificationEventHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly merchantNotificationsService: MerchantNotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    try {
      this.logger.log(`[${new Date().toISOString()}] ====== BOOKING CREATED EVENT RECEIVED ======`);
      this.logger.log(`[${new Date().toISOString()}] Handling booking created event: ${event.bookingId}, source: ${event.source}`);

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
                orderBy: { createdAt: 'asc' }, // Get the primary/first location
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

      // Prepare notification context
      // Get the first service (for now, assume single service booking)
      const firstService = booking.services[0];
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString('en-AU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          serviceName: firstService?.service?.name || 'Service',
          staffName: firstService?.staff ? (firstService.staff.lastName ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : firstService.staff.firstName) : 'Staff',
          duration: firstService?.duration || 60,
          price: Number(booking.totalAmount),
          locationName: booking.location?.name || '',
          locationAddress: booking.location?.address || '',
          locationPhone: booking.location?.phone || '',
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          // Include primary location address if available
          address: booking.merchant.locations?.[0]?.address,
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as 'email' | 'sms' | 'both',
        },
      };

      // Check merchant settings before sending booking confirmation
      const merchantSettings = booking.merchant.settings as any;
      const shouldSendEmail = merchantSettings?.bookingConfirmationEmail !== false; // Default to true
      const shouldSendSms = merchantSettings?.bookingConfirmationSms !== false; // Default to true

      if (shouldSendEmail || shouldSendSms) {
        // Override context to respect merchant settings
        const notificationContext = {
          ...context,
          customer: {
            ...context.customer,
            preferredChannel: this.determineMerchantPreferredChannel(
              context.customer.preferredChannel,
              shouldSendEmail,
              shouldSendSms
            ),
          },
        };

        // Send booking confirmation
        const results = await this.notificationsService.sendNotification(
          NotificationType.BOOKING_CONFIRMATION,
          notificationContext,
        );

        this.logger.log(
          `Booking confirmation sent - Email: ${results.email?.success}, SMS: ${results.sms?.success}`,
        );
      } else {
        this.logger.log(
          `Booking confirmation skipped - merchant has disabled all notification channels`,
        );
      }

      // Create merchant notification only for external bookings (from booking app) and if enabled
      if (event.source === 'ONLINE') {
        const customerName = booking.customer.lastName 
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
        
        // Panel notification
        if (merchantSettings?.newBookingNotification !== false) {
          this.logger.log(`[${new Date().toISOString()}] ====== CREATING MERCHANT NOTIFICATION ======`);
          this.logger.log(`[${new Date().toISOString()}] Creating merchant notification for ONLINE booking ${booking.id}`);
          await this.merchantNotificationsService.createBookingNotification(
            booking.merchantId,
            'booking_new',
            {
              id: booking.id,
              customerName,
              serviceName: firstService?.service?.name || 'Service',
              startTime: booking.startTime,
              staffName: firstService?.staff ? (firstService.staff.lastName ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : firstService.staff.firstName) : undefined,
            }
          );
          this.logger.log(`[${new Date().toISOString()}] Merchant notification created for booking ${booking.id}`);
        }
        
        // Email/SMS notifications for staff
        const shouldSendStaffEmail = merchantSettings?.newBookingNotificationEmail !== false;
        const shouldSendStaffSms = merchantSettings?.newBookingNotificationSms !== false;
        
        if (shouldSendStaffEmail || shouldSendStaffSms) {
          const staffContext = {
            ...context,
            // Override customer info with merchant info for staff notifications
            customer: {
              id: booking.merchant.id,
              email: booking.merchant.email,
              phone: booking.merchant.phone,
              firstName: booking.merchant.name,
              lastName: '',
              preferredChannel: this.determineMerchantPreferredChannel(
                'both',
                shouldSendStaffEmail,
                shouldSendStaffSms
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
        this.logger.log(`[${new Date().toISOString()}] Skipping merchant notification for ${event.source} booking ${booking.id}`);
      }

      // Schedule reminders (if enabled)
      await this.scheduleReminders(booking.id, booking.startTime, booking.merchant.settings as any);

    } catch (error) {
      this.logger.error(`Failed to handle booking created event: ${event.bookingId}`, error);
    }
  }

  private async scheduleReminders(bookingId: string, startTime: Date, merchantSettings: any): Promise<void> {
    try {
      // For MVP, we'll create scheduled jobs in the database
      // In production, use a proper job queue (Bull/BullMQ)
      
      const now = new Date();
      const reminder24h = new Date(startTime);
      reminder24h.setHours(reminder24h.getHours() - 24);
      
      const reminder2h = new Date(startTime);
      reminder2h.setHours(reminder2h.getHours() - 2);

      // Check if 24h reminders are enabled (default to true if not set)
      const should24hEmail = merchantSettings?.appointmentReminder24hEmail !== false;
      const should24hSms = merchantSettings?.appointmentReminder24hSms !== false;

      // Only schedule 24h reminder if in the future and at least one channel is enabled
      if (reminder24h > now && (should24hEmail || should24hSms)) {
        await this.prisma.scheduledNotification.create({
          data: {
            bookingId,
            type: NotificationType.BOOKING_REMINDER_24H,
            scheduledFor: reminder24h,
            status: 'pending',
          },
        });
        this.logger.log(`Scheduled 24h reminder for booking ${bookingId}`);
      }

      // Check if 2h reminders are enabled (default to true if not set)
      const should2hEmail = merchantSettings?.appointmentReminder2hEmail !== false;
      const should2hSms = merchantSettings?.appointmentReminder2hSms !== false;

      // Only schedule 2h reminder if in the future and at least one channel is enabled
      if (reminder2h > now && (should2hEmail || should2hSms)) {
        await this.prisma.scheduledNotification.create({
          data: {
            bookingId,
            type: NotificationType.BOOKING_REMINDER_2H,
            scheduledFor: reminder2h,
            status: 'pending',
          },
        });
        this.logger.log(`Scheduled 2h reminder for booking ${bookingId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to schedule reminders for booking ${bookingId}`, error);
    }
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: { bookingId: string; source?: string }): Promise<void> {
    try {
      this.logger.log(`Handling booking cancelled event: ${event.bookingId}, source: ${event.source}`);

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
                orderBy: { createdAt: 'asc' }, // Get the primary/first location
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

      // Prepare notification context
      // Get the first service (for now, assume single service booking)
      const firstService = booking.services[0];
      const context = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          date: booking.startTime,
          time: booking.startTime.toLocaleTimeString('en-AU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          serviceName: firstService?.service?.name || 'Service',
          staffName: firstService?.staff ? (firstService.staff.lastName ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : firstService.staff.firstName) : 'Staff',
          duration: firstService?.duration || 60,
          price: Number(booking.totalAmount),
          locationName: booking.location?.name || '',
          locationAddress: booking.location?.address || '',
          locationPhone: booking.location?.phone || '',
        },
        merchant: {
          id: booking.merchant.id,
          name: booking.merchant.name,
          email: booking.merchant.email,
          phone: booking.merchant.phone,
          website: booking.merchant.website,
          // Include primary location address if available
          address: booking.merchant.locations?.[0]?.address,
        },
        customer: {
          id: booking.customer.id,
          email: booking.customer.email,
          phone: booking.customer.phone,
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          preferredChannel: booking.customer.notificationPreference as 'email' | 'sms' | 'both',
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
      if (event.source === 'ONLINE') {
        const customerName = booking.customer.lastName 
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
        
        // Panel notification
        if (merchantSettings?.cancellationNotification !== false) {
          await this.merchantNotificationsService.createBookingNotification(
            booking.merchantId,
            'booking_cancelled',
            {
              id: booking.id,
              customerName,
              serviceName: firstService?.service?.name || 'Service',
              startTime: booking.startTime,
              staffName: firstService?.staff ? (firstService.staff.lastName ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : firstService.staff.firstName) : undefined,
            }
          );
        }
        
        // Email/SMS notifications for staff
        const shouldSendStaffEmail = merchantSettings?.cancellationNotificationEmail !== false;
        const shouldSendStaffSms = merchantSettings?.cancellationNotificationSms !== false;
        
        if (shouldSendStaffEmail || shouldSendStaffSms) {
          const staffContext = {
            ...context,
            // Override customer info with merchant info for staff notifications
            customer: {
              id: booking.merchant.id,
              email: booking.merchant.email,
              phone: booking.merchant.phone,
              firstName: booking.merchant.name,
              lastName: '',
              preferredChannel: this.determineMerchantPreferredChannel(
                'both',
                shouldSendStaffEmail,
                shouldSendStaffSms
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
        this.logger.log(`Skipping merchant notification for ${event.source || 'unknown'} cancelled booking ${booking.id}`);
      }

      // Cancel any pending reminders
      await this.cancelReminders(booking.id);

    } catch (error) {
      this.logger.error(`Failed to handle booking cancelled event: ${event.bookingId}`, error);
    }
  }

  private async cancelReminders(bookingId: string): Promise<void> {
    try {
      await this.prisma.scheduledNotification.updateMany({
        where: {
          bookingId,
          status: 'pending',
        },
        data: {
          status: 'cancelled',
        },
      });
      this.logger.log(`Cancelled pending reminders for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel reminders for booking ${bookingId}`, error);
    }
  }

  @OnEvent('booking.rescheduled')
  async handleBookingRescheduled(event: { 
    bookingId: string; 
    oldStartTime?: Date | string;
    newStartTime?: Date | string;
    oldEndTime?: Date | string;
    newEndTime?: Date | string;
    source?: string;
  }): Promise<void> {
    try {
      this.logger.log(`[${new Date().toISOString()}] Handling booking rescheduled event:`, {
        bookingId: event.bookingId,
        oldStartTime: event.oldStartTime,
        newStartTime: event.newStartTime,
        source: event.source
      });

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
                orderBy: { createdAt: 'asc' }, // Get the primary/first location
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
      if (event.source === 'ONLINE') {
        const customerName = booking.customer.lastName 
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
        const firstService = booking.services[0];
        
        this.logger.log(`[${new Date().toISOString()}] Creating merchant notification for ONLINE rescheduled booking ${booking.id}`);
        await this.merchantNotificationsService.createBookingNotification(
          booking.merchantId,
          'booking_modified',
          {
            id: booking.id,
            customerName,
            serviceName: firstService?.service?.name || 'Service',
            startTime: booking.startTime,
            staffName: firstService?.staff ? (firstService.staff.lastName ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : firstService.staff.firstName) : undefined,
          },
          'has been rescheduled',
        );
        this.logger.log(`[${new Date().toISOString()}] Merchant notification created for rescheduled booking ${booking.id}`);
      } else {
        this.logger.log(`[${new Date().toISOString()}] Skipping merchant notification for ${event.source || 'unknown'} rescheduled booking ${booking.id}`);
      }

      // Cancel old reminders and schedule new ones
      await this.cancelReminders(booking.id);
      if (event.newStartTime) {
        const newStartDate = typeof event.newStartTime === 'string' ? new Date(event.newStartTime) : event.newStartTime;
        await this.scheduleReminders(booking.id, newStartDate, booking.merchant.settings as any);
      }

    } catch (error) {
      this.logger.error(`Failed to handle booking rescheduled event: ${event.bookingId}`, error);
    }
  }

  @OnEvent('booking.completed')
  async handleBookingCompleted(event: { bookingId: string; source?: string }): Promise<void> {
    try {
      this.logger.log(`Handling booking completed event: ${event.bookingId}, source: ${event.source}`);

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
                orderBy: { createdAt: 'asc' }, // Get the primary/first location
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
      if (event.source === 'ONLINE') {
        const customerName = booking.customer.lastName 
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
        const firstService = booking.services[0];
        await this.merchantNotificationsService.createBookingNotification(
          booking.merchantId,
          'booking_modified',
          {
            id: booking.id,
            customerName,
            serviceName: firstService?.service?.name || 'Service',
            startTime: booking.startTime,
            staffName: firstService?.staff ? (firstService.staff.lastName ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : firstService.staff.firstName) : undefined,
          },
          'completed their appointment',
        );
      } else {
        this.logger.log(`Skipping merchant notification for ${event.source || 'unknown'} completed booking ${booking.id}`);
      }

      this.logger.log(`Booking completed notification created for booking ${event.bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to handle booking completed event for ${event.bookingId}`, error);
    }
  }

  private determineMerchantPreferredChannel(
    customerPreference: 'email' | 'sms' | 'both',
    emailEnabled: boolean,
    smsEnabled: boolean,
  ): 'email' | 'sms' | 'both' {
    // If merchant has disabled both channels, return 'both' to skip sending
    if (!emailEnabled && !smsEnabled) {
      return 'both'; // This will result in no notifications being sent
    }

    // If only one channel is enabled by merchant, use that
    if (emailEnabled && !smsEnabled) {
      return 'email';
    }
    if (!emailEnabled && smsEnabled) {
      return 'sms';
    }

    // Both channels are enabled by merchant, respect customer preference
    return customerPreference;
  }
}