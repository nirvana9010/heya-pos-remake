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

  constructor(
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
    private readonly twilioService: TwilioSmsService,
  ) {}

  getProvider(): SmsProvider {
    // Choose provider based on configuration
    if (this.configService.get('TWILIO_ACCOUNT_SID')) {
      this.logger.log('Using Twilio as SMS provider');
      return this.twilioService;
    } else {
      this.logger.log('Using Mock SMS provider');
      return this.smsService;
    }
  }
}