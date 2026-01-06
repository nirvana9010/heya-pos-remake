import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationContext,
  NotificationResult,
  NotificationType,
} from "../interfaces/notification.interface";
import { SmsTemplateService } from "../templates/sms-template.service";

// For MVP, we'll use a mock SMS service
// In production, integrate with Twilio/MessageBird/AWS SNS
interface SmsProvider {
  sendMessage(to: string, message: string): Promise<{ messageId: string }>;
}

class MockSmsProvider implements SmsProvider {
  async sendMessage(
    to: string,
    message: string,
  ): Promise<{ messageId: string }> {
    // In development, just log the message
    console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
    return { messageId: `mock-${Date.now()}` };
  }
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private provider: SmsProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: SmsTemplateService,
  ) {
    // For MVP, use mock provider
    // TODO: Replace with real provider (Twilio/MessageBird)
    const isProduction = this.configService.get("NODE_ENV") === "production";

    if (isProduction && this.configService.get("SMS_PROVIDER")) {
      // Initialize real provider
      this.logger.warn("Real SMS provider not implemented yet, using mock");
      this.provider = new MockSmsProvider();
    } else {
      this.provider = new MockSmsProvider();
    }
  }

  async sendNotification(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<NotificationResult> {
    try {
      if (!context.customer.phone) {
        return {
          success: false,
          error: "No phone number provided",
          channel: "sms",
        };
      }

      const message = await this.templateService.renderSmsTemplate(
        type,
        context,
      );

      // Format phone number (basic validation)
      const formattedPhone = this.formatPhoneNumber(context.customer.phone);

      const result = await this.provider.sendMessage(formattedPhone, message);

      this.logger.log(`SMS sent successfully: ${result.messageId}`);
      return {
        success: true,
        messageId: result.messageId,
        channel: "sms",
      };
    } catch (error) {
      this.logger.error("Failed to send SMS", error);
      return {
        success: false,
        error: (error as Error).message,
        channel: "sms",
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "");

    // Add country code if not present (assuming Australia)
    if (!cleaned.startsWith("61") && cleaned.startsWith("0")) {
      cleaned = "61" + cleaned.substring(1);
    } else if (!cleaned.startsWith("61")) {
      cleaned = "61" + cleaned;
    }

    return "+" + cleaned;
  }
}
