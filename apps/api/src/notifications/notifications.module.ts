import { Module, Logger } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { EmailService } from "./email/email.service";
import { SmsService } from "./sms/sms.service";
import { SendGridEmailService } from "./email/sendgrid-email.service";
import { TwilioSmsService } from "./sms/twilio-sms.service";
import { EmailProviderFactory } from "./email/email-provider.factory";
import { SmsProviderFactory } from "./sms/sms-provider.factory";
import { EmailTemplateService } from "./templates/email-template.service";
import { SmsTemplateService } from "./templates/sms-template.service";
import { NotificationEventHandler } from "./handlers/notification-event.handler";
import { SimpleSchedulerService } from "./simple-scheduler.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TestNotificationsController } from "./test-notifications.controller";
import { MerchantNotificationsController } from "./merchant-notifications.controller";
import { MerchantNotificationsService } from "./merchant-notifications.service";
import { NotificationsSseController } from "./sse/notifications-sse.controller";
import { PostgresListenerService } from "./postgres-listener.service";
import { NotificationsGateway } from "./notifications.gateway";
import { JwtModule } from "@nestjs/jwt";
import { NotificationHistoryController } from "./notification-history.controller";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [
    MerchantNotificationsController,
    NotificationsSseController,
    NotificationHistoryController,
    ...(process.env.NODE_ENV !== "production"
      ? [TestNotificationsController]
      : []),
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
    PostgresListenerService, // PostgreSQL LISTEN/NOTIFY service for real-time events
    NotificationsGateway, // WebSocket gateway for real-time client communication
  ],
  exports: [NotificationsService, MerchantNotificationsService],
})
export class NotificationsModule {
  private readonly logger = new Logger(NotificationsModule.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {
    this.logger.log("🔧 NotificationsModule constructor called");
    this.logger.log(
      `🔧 NotificationsGateway injected: ${!!notificationsGateway}`,
    );
    if (notificationsGateway) {
      this.logger.log("🔧 NotificationsGateway instance exists in module");
    }
  }
}
