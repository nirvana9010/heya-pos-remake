import { Injectable, Logger } from '@nestjs/common';
import { EmailProviderFactory } from './email/email-provider.factory';
import { SmsProviderFactory } from './sms/sms-provider.factory';
import { NotificationContext, NotificationResult, NotificationType } from './interfaces/notification.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly emailProviderFactory: EmailProviderFactory,
    private readonly smsProviderFactory: SmsProviderFactory,
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
      results.email = await this.sendEmailWithFallback(type, context);

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
    }

    // Send via SMS if enabled
    if (channels.sms && context.customer.phone) {
      try {
        const smsProvider = this.smsProviderFactory.getProvider();
        results.sms = await smsProvider.sendNotification(type, context);
        
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

  private async sendEmailWithFallback(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<NotificationResult> {
    const providers = this.emailProviderFactory.getProviders();

    if (providers.length === 0) {
      this.logger.warn('No email providers configured; skipping email notification');
      return {
        success: false,
        error: 'No email provider configured',
        channel: 'email',
      };
    }

    let attempt = 0;
    let lastError: string | undefined;

    for (const provider of providers) {
      attempt += 1;
      const providerName = provider.constructor?.name ?? 'EmailProvider';

      try {
        this.logger.debug(`Attempting booking email via ${providerName}`);
        const result = await provider.sendNotification(type, context);

        if (result.success) {
          if (attempt > 1) {
            this.logger.warn(
              `Primary email provider failed; fallback ${providerName} succeeded for booking ${context.booking?.id ?? 'unknown'}`,
            );
          }
          return result;
        }

        lastError = result.error || 'Unknown error';
        this.logger.warn(
          `Email provider ${providerName} responded with failure: ${lastError}`,
        );
      } catch (error) {
        lastError = (error as Error).message;
        this.logger.error(
          `Email provider ${providerName} threw an error`,
          error,
        );
      }
    }

    this.logger.error(
      `All configured email providers failed to send booking confirmation. Last error: ${lastError ?? 'Unknown error'}`,
    );

    return {
      success: false,
      error: lastError || 'All email providers failed',
      channel: 'email',
    };
  }

  private determineChannels(context: NotificationContext): { email: boolean; sms: boolean } {
    const emailOptIn = context.customer.emailNotifications ?? true;
    const smsOptIn = context.customer.smsNotifications ?? true;

    let emailPreferred = true;
    let smsPreferred = true;

    switch (context.customer.preferredChannel) {
      case 'email':
        smsPreferred = false;
        break;
      case 'sms':
        emailPreferred = false;
        break;
      case 'both':
      default:
        break;
    }

    return {
      email: emailOptIn && emailPreferred,
      sms: smsOptIn && smsPreferred,
    };
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
  }, take = 100): Promise<any[]> {
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
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      take,
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

  async sendLoyaltyReminder(params: {
    type: NotificationType;
    merchant: NotificationContext['merchant'];
    customer: NotificationContext['customer'] & {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
    };
    template: {
      emailSubject?: string;
      emailBody?: string;
      smsBody?: string;
    };
    context: {
      programType: 'VISITS' | 'POINTS';
      thresholdValue: number;
      currentValue: number;
      rewardType?: string | null;
      rewardValue?: number | null;
      pointsValue?: number | null;
    };
  }): Promise<void> {
    const sequence = this.getTouchpointSequence(params.type);

    const notificationContext: NotificationContext = {
      merchant: params.merchant,
      customer: params.customer,
      loyaltyReminder: {
        sequence,
        emailSubject: params.template.emailSubject,
        emailBody: params.template.emailBody,
        smsBody: params.template.smsBody,
        programType: params.context.programType,
        thresholdValue: params.context.thresholdValue,
        currentValue: params.context.currentValue,
        rewardType: params.context.rewardType ?? undefined,
        rewardValue: params.context.rewardValue ?? undefined,
        pointsValue: params.context.pointsValue ?? undefined,
      },
    };

    const channels = this.determineChannels(notificationContext);

    const hasEmailContent =
      (!!params.template.emailSubject && params.template.emailSubject.trim().length > 0) ||
      (!!params.template.emailBody && params.template.emailBody.trim().length > 0);

    if (channels.email && params.customer.email && hasEmailContent) {
      const emailResult = await this.sendEmailWithFallback(
        params.type,
        notificationContext,
      );

      await this.logNotification({
        customerId: params.customer.id,
        merchantId: params.merchant.id,
        type: params.type,
        channel: 'email',
        recipient: params.customer.email,
        status: emailResult.success ? 'sent' : 'failed',
        messageId: emailResult.messageId,
        error: emailResult.error,
      });
    }

    const hasSmsContent =
      !!params.template.smsBody && params.template.smsBody.trim().length > 0;

    if (channels.sms && params.customer.phone && (hasSmsContent || hasEmailContent)) {
      try {
        const smsProvider = this.smsProviderFactory.getProvider();
        const smsResult = await smsProvider.sendNotification(
          params.type,
          notificationContext,
        );

        await this.logNotification({
          customerId: params.customer.id,
          merchantId: params.merchant.id,
          type: params.type,
          channel: 'sms',
          recipient: params.customer.phone,
          status: smsResult.success ? 'sent' : 'failed',
          messageId: smsResult.messageId,
          error: smsResult.error,
        });
      } catch (error) {
        this.logger.error('Failed to send loyalty reminder SMS', error);
        await this.logNotification({
          customerId: params.customer.id,
          merchantId: params.merchant.id,
          type: params.type,
          channel: 'sms',
          recipient: params.customer.phone,
          status: 'failed',
          error: (error as Error).message,
        });
      }
    }
  }

  private getTouchpointSequence(type: NotificationType): number {
    switch (type) {
      case NotificationType.LOYALTY_TOUCHPOINT_1:
        return 1;
      case NotificationType.LOYALTY_TOUCHPOINT_2:
        return 2;
      case NotificationType.LOYALTY_TOUCHPOINT_3:
      default:
        return 3;
    }
  }
}
