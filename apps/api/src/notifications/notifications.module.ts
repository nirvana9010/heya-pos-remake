import { Module, DynamicModule } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { EmailTemplateService } from './templates/email-template.service';
import { SmsTemplateService } from './templates/sms-template.service';
import { NotificationEventHandler } from './handlers/notification-event.handler';
import { SimpleSchedulerService } from './simple-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

// Conditionally import schedule-dependent services
const scheduleProviders = [];
const scheduleImports = [];

// Only enable scheduled notifications if not in a serverless environment
if (process.env.DISABLE_SCHEDULED_JOBS !== 'true') {
  try {
    // Try to use @nestjs/schedule if available
    const { ScheduleModule } = require('@nestjs/schedule');
    const { ScheduledNotificationsService } = require('./scheduled-notifications.service');
    scheduleImports.push(ScheduleModule.forRoot());
    scheduleProviders.push(ScheduledNotificationsService);
    console.log('[NotificationsModule] Using @nestjs/schedule for scheduled notifications');
  } catch (error) {
    // Fallback to simple scheduler if @nestjs/schedule fails
    console.warn('[NotificationsModule] @nestjs/schedule not available, using simple scheduler');
    scheduleProviders.push(SimpleSchedulerService);
  }
} else {
  console.log('[NotificationsModule] Scheduled notifications disabled via DISABLE_SCHEDULED_JOBS');
}

@Module({
  imports: [
    PrismaModule,
    ...scheduleImports,
  ],
  providers: [
    NotificationsService,
    EmailService,
    SmsService,
    EmailTemplateService,
    SmsTemplateService,
    NotificationEventHandler,
    ...scheduleProviders,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}