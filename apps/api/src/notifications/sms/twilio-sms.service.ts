import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const twilio = require('twilio');
import { NotificationContext, NotificationResult, NotificationType } from '../interfaces/notification.interface';
import { SmsTemplateService } from '../templates/sms-template.service';

@Injectable()
export class TwilioSmsService {
  private readonly logger = new Logger(TwilioSmsService.name);
  private readonly client: any;
  private readonly isEnabled: boolean;
  private readonly fromNumber: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: SmsTemplateService,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get('TWILIO_PHONE_NUMBER', '');
    
    this.isEnabled = !!(accountSid && authToken && this.fromNumber);
    
    if (this.isEnabled) {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service initialized');
    } else {
      this.client = null;
      this.logger.warn('Twilio credentials not found, SMS sending disabled');
    }
  }

  async sendNotification(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<NotificationResult> {
    if (!this.isEnabled || !this.client) {
      this.logger.warn('Twilio is not enabled, skipping SMS');
      return {
        success: false,
        error: 'Twilio not configured',
        channel: 'sms',
      };
    }

    try {
      if (!context.customer.phone) {
        return {
          success: false,
          error: 'No phone number provided',
          channel: 'sms',
        };
      }

      const message = await this.templateService.renderSmsTemplate(type, context);
      const formattedPhone = this.formatPhoneNumber(context.customer.phone);
      
      // Send SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone,
        // Optional: Add status callback for delivery tracking
        statusCallback: this.configService.get('TWILIO_STATUS_CALLBACK_URL'),
      });

      this.logger.log(`Twilio SMS sent successfully: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid,
        channel: 'sms',
      };
    } catch (error: any) {
      this.logger.error('Failed to send Twilio SMS', error);
      
      // Extract meaningful error from Twilio response
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.code) {
        errorMessage = `${error.code}: ${errorMessage}`;
      }
      
      return {
        success: false,
        error: errorMessage,
        channel: 'sms',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      // Verify account by fetching account details
      const account = await this.client.api.accounts(
        this.configService.get('TWILIO_ACCOUNT_SID')
      ).fetch();
      
      this.logger.log(`Twilio account verified: ${account.friendlyName}`);
      return true;
    } catch (error) {
      this.logger.error('Twilio verification failed', error);
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Australian numbers (add country code if not present)
    if (!cleaned.startsWith('61') && cleaned.startsWith('0')) {
      cleaned = '61' + cleaned.substring(1);
    } else if (!cleaned.startsWith('61') && !cleaned.startsWith('+')) {
      // Assume Australian number if no country code
      cleaned = '61' + cleaned;
    }
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // Helper method to validate phone number format
  async validatePhoneNumber(phone: string): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const phoneNumber = await this.client.lookups.v1
        .phoneNumbers(formattedPhone)
        .fetch();
      
      return !!phoneNumber.phoneNumber;
    } catch (error) {
      this.logger.error(`Phone validation failed for ${phone}`, error);
      return false;
    }
  }
}