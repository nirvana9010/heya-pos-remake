import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { SendGridEmailService } from './email/sendgrid-email.service';
import { TwilioSmsService } from './sms/twilio-sms.service';
import { EmailProviderFactory } from './email/email-provider.factory';
import { SmsProviderFactory } from './sms/sms-provider.factory';
import { EmailTemplateService } from './templates/email-template.service';
import { SmsTemplateService } from './templates/sms-template.service';
import { NotificationEventHandler } from './handlers/notification-event.handler';
import { SimpleSchedulerService } from './simple-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TestNotificationsController } from './test-notifications.controller';
import { MerchantNotificationsController } from './merchant-notifications.controller';
import { MerchantNotificationsService } from './merchant-notifications.service';
import { NotificationsSseController } from './sse/notifications-sse.controller';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    MerchantNotificationsController,
    NotificationsSseController,
    ...(process.env.NODE_ENV !== 'production' ? [TestNotificationsController] : []),
  ],
  providers: [
    NotificationsService,
    MerchantNotificationsService,
    EmailService,
    SmsService,
    SendGridEmailService,
    TwilioSmsService,
    EmailProviderFactory,
    SmsProviderFactory,
    EmailTemplateService,
    SmsTemplateService,
    NotificationEventHandler,
    SimpleSchedulerService, // Always use simple scheduler - no crypto dependencies
  ],
  exports: [NotificationsService, MerchantNotificationsService],
})
export class NotificationsModule {}