import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { EmailTemplateService } from './templates/email-template.service';
import { SmsTemplateService } from './templates/sms-template.service';
import { NotificationEventHandler } from './handlers/notification-event.handler';
import { ScheduledNotificationsService } from './scheduled-notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    NotificationsService,
    EmailService,
    SmsService,
    EmailTemplateService,
    SmsTemplateService,
    NotificationEventHandler,
    ScheduledNotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}