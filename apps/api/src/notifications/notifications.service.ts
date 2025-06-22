import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { NotificationContext, NotificationResult, NotificationType } from './interfaces/notification.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
  ) {}

  async sendNotification(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<{ email?: NotificationResult; sms?: NotificationResult }> {
    const results: { email?: NotificationResult; sms?: NotificationResult } = {};

    // Determine which channels to use based on customer preferences
    const channels = this.determineChannels(context);

    // Send via email if enabled
    if (channels.email && context.customer.email) {
      try {
        results.email = await this.emailService.sendNotification(type, context);
        
        // Log notification in database
        await this.logNotification({
          customerId: context.customer.id,
          merchantId: context.merchant.id,
          bookingId: context.booking?.id,
          type,
          channel: 'email',
          recipient: context.customer.email,
          status: results.email.success ? 'sent' : 'failed',
          messageId: results.email.messageId,
          error: results.email.error,
        });
      } catch (error) {
        this.logger.error('Failed to send email notification', error);
        results.email = {
          success: false,
          error: (error as Error).message,
          channel: 'email',
        };
      }
    }

    // Send via SMS if enabled
    if (channels.sms && context.customer.phone) {
      try {
        results.sms = await this.smsService.sendNotification(type, context);
        
        // Log notification in database
        await this.logNotification({
          customerId: context.customer.id,
          merchantId: context.merchant.id,
          bookingId: context.booking?.id,
          type,
          channel: 'sms',
          recipient: context.customer.phone,
          status: results.sms.success ? 'sent' : 'failed',
          messageId: results.sms.messageId,
          error: results.sms.error,
        });
      } catch (error) {
        this.logger.error('Failed to send SMS notification', error);
        results.sms = {
          success: false,
          error: (error as Error).message,
          channel: 'sms',
        };
      }
    }

    return results;
  }

  private determineChannels(context: NotificationContext): { email: boolean; sms: boolean } {
    // Check customer preferences
    if (context.customer.preferredChannel === 'email') {
      return { email: true, sms: false };
    }
    if (context.customer.preferredChannel === 'sms') {
      return { email: false, sms: true };
    }
    
    // Default to both channels if preference is 'both' or not set
    return { email: true, sms: true };
  }

  private async logNotification(data: {
    customerId: string;
    merchantId: string;
    bookingId?: string;
    type: NotificationType;
    channel: 'email' | 'sms';
    recipient: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
  }): Promise<void> {
    try {
      // Create notification log entry
      await this.prisma.notificationLog.create({
        data: {
          customerId: data.customerId,
          merchantId: data.merchantId,
          bookingId: data.bookingId,
          type: data.type,
          channel: data.channel,
          recipient: data.recipient,
          status: data.status,
          messageId: data.messageId,
          error: data.error,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      // Don't throw - logging failure shouldn't break notification sending
      this.logger.error('Failed to log notification', error);
    }
  }

  async getNotificationHistory(filters: {
    customerId?: string;
    merchantId?: string;
    bookingId?: string;
    type?: NotificationType;
    channel?: 'email' | 'sms';
    status?: 'sent' | 'failed';
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    return this.prisma.notificationLog.findMany({
      where: {
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.merchantId && { merchantId: filters.merchantId }),
        ...(filters.bookingId && { bookingId: filters.bookingId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && filters.endDate && {
          sentAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  async getCustomerNotificationPreferences(customerId: string): Promise<{
    email: boolean;
    sms: boolean;
    preferredChannel?: 'email' | 'sms' | 'both';
  }> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        emailNotifications: true,
        smsNotifications: true,
        notificationPreference: true,
      },
    });

    if (!customer) {
      // Default preferences if customer not found
      return { email: true, sms: true, preferredChannel: 'both' };
    }

    return {
      email: customer.emailNotifications ?? true,
      sms: customer.smsNotifications ?? true,
      preferredChannel: customer.notificationPreference as 'email' | 'sms' | 'both' || 'both',
    };
  }

  async updateCustomerNotificationPreferences(
    customerId: string,
    preferences: {
      email?: boolean;
      sms?: boolean;
      preferredChannel?: 'email' | 'sms' | 'both';
    },
  ): Promise<void> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(preferences.email !== undefined && { emailNotifications: preferences.email }),
        ...(preferences.sms !== undefined && { smsNotifications: preferences.sms }),
        ...(preferences.preferredChannel && { notificationPreference: preferences.preferredChannel }),
      },
    });
  }
}