import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { EmailTemplateService } from './templates/email-template.service';
import { SmsTemplateService } from './templates/sms-template.service';
import { NotificationEventHandler } from './handlers/notification-event.handler';
import { SimpleSchedulerService } from './simple-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  providers: [
    NotificationsService,
    EmailService,
    SmsService,
    EmailTemplateService,
    SmsTemplateService,
    NotificationEventHandler,
    SimpleSchedulerService, // Always use simple scheduler - no crypto dependencies
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}