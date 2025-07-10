import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './interfaces/notification.interface';

/**
 * Simple scheduler service that doesn't depend on @nestjs/schedule
 * Uses native setInterval for environments where crypto module is not available
 */
@Injectable()
export class SimpleSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimpleSchedulerService.name);
  private schedulerInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Start the scheduler only if not disabled
    if (process.env.DISABLE_SCHEDULED_JOBS !== 'true') {
      this.startScheduler();
      this.logger.log('Simple notification scheduler started');
    } else {
      this.logger.log('Scheduled notifications disabled via environment variable');
    }
  }

  onModuleDestroy() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private startScheduler() {
    // Process notifications every 5 minutes
    this.schedulerInterval = setInterval(() => {
      this.processScheduledNotifications().catch(error => {
        this.logger.error('Failed to process scheduled notifications', error);
      });
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup old notifications daily
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldNotifications().catch(error => {
        this.logger.error('Failed to cleanup old notifications', error);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Run immediately on startup
    this.processScheduledNotifications().catch(error => {
      this.logger.error('Failed to process scheduled notifications on startup', error);
    });
  }

  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      
      const notifications = await this.prisma.scheduledNotification.findMany({
        where: {
          status: 'pending',
          scheduledFor: {
            lte: now,
          },
        },
        include: {
          booking: {
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
          },
        },
        take: 50,
      });

      this.logger.log(`Found ${notifications.length} scheduled notifications to process`);

      for (const notification of notifications) {
        try {
          if (notification.booking.status === 'CANCELLED') {
            await this.prisma.scheduledNotification.update({
              where: { id: notification.id },
              data: {
                status: 'cancelled',
                error: 'Booking was cancelled',
              },
            });
            continue;
          }

          const firstService = notification.booking.services[0];
          const context = {
            booking: {
              id: notification.booking.id,
              bookingNumber: notification.booking.bookingNumber,
              date: notification.booking.startTime,
              time: notification.booking.startTime.toLocaleTimeString('en-AU', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              serviceName: firstService?.service?.name || 'Service',
              staffName: firstService?.staff ? `${firstService.staff.firstName} ${firstService.staff.lastName}`.trim() : 'Staff',
              duration: firstService?.duration || 60,
              price: Number(notification.booking.totalAmount),
              locationName: notification.booking.location?.name || '',
              locationAddress: notification.booking.location?.address || '',
              locationPhone: notification.booking.location?.phone || '',
            },
            merchant: {
              id: notification.booking.merchant.id,
              name: notification.booking.merchant.name,
              email: notification.booking.merchant.email,
              phone: notification.booking.merchant.phone,
              website: notification.booking.merchant.website,
            },
            customer: {
              id: notification.booking.customer.id,
              email: notification.booking.customer.email,
              phone: notification.booking.customer.phone,
              firstName: notification.booking.customer.firstName,
              lastName: notification.booking.customer.lastName,
              preferredChannel: notification.booking.customer.notificationPreference as 'email' | 'sms' | 'both',
            },
          };

          // Check merchant settings for reminder preferences
          const merchantSettings = notification.booking.merchant.settings as any;
          let shouldSendEmail = true;
          let shouldSendSms = true;

          if (notification.type === NotificationType.BOOKING_REMINDER_24H) {
            shouldSendEmail = merchantSettings?.appointmentReminder24hEmail !== false;
            shouldSendSms = merchantSettings?.appointmentReminder24hSms !== false;
          } else if (notification.type === NotificationType.BOOKING_REMINDER_2H) {
            shouldSendEmail = merchantSettings?.appointmentReminder2hEmail !== false;
            shouldSendSms = merchantSettings?.appointmentReminder2hSms !== false;
          }

          if (!shouldSendEmail && !shouldSendSms) {
            // Skip sending if both channels are disabled
            await this.prisma.scheduledNotification.update({
              where: { id: notification.id },
              data: {
                status: 'cancelled',
                error: 'Merchant has disabled this reminder type',
              },
            });
            this.logger.log(
              `Skipped scheduled notification ${notification.id}: merchant settings disabled`,
            );
            continue;
          }

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

          const results = await this.notificationsService.sendNotification(
            notification.type as NotificationType,
            notificationContext,
          );

          const success = results.email?.success || results.sms?.success;
          await this.prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: {
              status: success ? 'sent' : 'failed',
              sentAt: success ? new Date() : null,
              error: !success ? 'Failed to send via all channels' : null,
            },
          });

          this.logger.log(
            `Processed scheduled notification ${notification.id}: ${success ? 'sent' : 'failed'}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process scheduled notification ${notification.id}`,
            error,
          );
          
          await this.prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: {
              status: 'failed',
              error: (error as Error).message,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications', error);
    }
  }

  async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.scheduledNotification.deleteMany({
        where: {
          status: {
            in: ['sent', 'failed', 'cancelled'],
          },
          updatedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old scheduled notifications`);
    } catch (error) {
      this.logger.error('Failed to cleanup old notifications', error);
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