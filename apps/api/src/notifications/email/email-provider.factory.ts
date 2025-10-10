import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { SendGridEmailService } from './sendgrid-email.service';
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

  getProviders(): EmailProvider[] {
    const providers: EmailProvider[] = [];
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendGridApiKey) {
      providers.push(this.sendGridService);
    }

    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    if (emailUser && emailPass) {
      providers.push(this.emailService);
    }

    if (providers.length === 0) {
      this.logger.warn('No configured email providers found; booking emails will be skipped');
    }

    return providers;
  }

  getProvider(): EmailProvider {
    const [primary] = this.getProviders();
    return primary ?? this.emailService;
  }
}
