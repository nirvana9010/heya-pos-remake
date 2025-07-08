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
      this.logger.log(`[${new Date().toISOString()}] Handling booking created event: ${event.bookingId}, source: ${event.source}`);

      // Fetch full booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: event.bookingId },
        include: {
          customer: true,
          merchant: true,
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

      // Send booking confirmation
      const results = await this.notificationsService.sendNotification(
        NotificationType.BOOKING_CONFIRMATION,
        context,
      );

      this.logger.log(
        `Booking confirmation sent - Email: ${results.email?.success}, SMS: ${results.sms?.success}`,
      );

      // Create merchant notification only for external bookings (from booking app)
      if (event.source === 'ONLINE') {
        const customerName = booking.customer.lastName 
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
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
      } else {
        this.logger.log(`[${new Date().toISOString()}] Skipping merchant notification for ${event.source} booking ${booking.id}`);
      }

      // Schedule reminders (if enabled)
      await this.scheduleReminders(booking.id, booking.startTime);

    } catch (error) {
      this.logger.error(`Failed to handle booking created event: ${event.bookingId}`, error);
    }
  }

  private async scheduleReminders(bookingId: string, startTime: Date): Promise<void> {
    try {
      // For MVP, we'll create scheduled jobs in the database
      // In production, use a proper job queue (Bull/BullMQ)
      
      const now = new Date();
      const reminder24h = new Date(startTime);
      reminder24h.setHours(reminder24h.getHours() - 24);
      
      const reminder2h = new Date(startTime);
      reminder2h.setHours(reminder2h.getHours() - 2);

      // Only schedule if in the future
      if (reminder24h > now) {
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

      if (reminder2h > now) {
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
          merchant: true,
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

      // Create merchant notification only for external bookings
      if (event.source === 'ONLINE') {
        const customerName = booking.customer.lastName 
          ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
          : booking.customer.firstName;
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
          merchant: true,
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
        await this.scheduleReminders(booking.id, newStartDate);
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
          merchant: true,
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
}