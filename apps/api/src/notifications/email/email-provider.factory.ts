import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { SendGridEmailService } from './sendgrid-email.service';
import { EmailTemplateService } from '../templates/email-template.service';
import { NotificationContext, NotificationResult, NotificationType } from '../interfaces/notification.interface';

export interface EmailProvider {
  sendNotification(type: NotificationType, context: NotificationContext): Promise<NotificationResult>;
  verifyConnection(): Promise<boolean>;
}

@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly sendGridService: SendGridEmailService,
  ) {}

  getProvider(): EmailProvider {
    // Choose provider based on configuration
    if (this.configService.get('SENDGRID_API_KEY')) {
      this.logger.log('Using SendGrid as email provider');
      return this.sendGridService;
    } else {
      this.logger.log('Using SMTP as email provider');
      return this.emailService;
    }
  }
}