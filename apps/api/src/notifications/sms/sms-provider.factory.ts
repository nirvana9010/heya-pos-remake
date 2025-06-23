import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { TwilioSmsService } from './twilio-sms.service';
import { SmsTemplateService } from '../templates/sms-template.service';
import { NotificationContext, NotificationResult, NotificationType } from '../interfaces/notification.interface';

export interface SmsProvider {
  sendNotification(type: NotificationType, context: NotificationContext): Promise<NotificationResult>;
}

@Injectable()
export class SmsProviderFactory {
  private readonly logger = new Logger(SmsProviderFactory.name);
  private readonly provider: SmsProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: SmsTemplateService,
  ) {
    // Choose provider based on configuration
    if (this.configService.get('TWILIO_ACCOUNT_SID')) {
      this.logger.log('Using Twilio as SMS provider');
      this.provider = new TwilioSmsService(configService, templateService);
    } else {
      this.logger.log('Using Mock SMS provider');
      this.provider = new SmsService(configService, templateService);
    }
  }

  getProvider(): SmsProvider {
    return this.provider;
  }
}