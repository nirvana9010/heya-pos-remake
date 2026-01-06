import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
const sgMail = require("@sendgrid/mail");
import {
  NotificationContext,
  NotificationResult,
  NotificationType,
} from "../interfaces/notification.interface";
import { EmailTemplateService } from "../templates/email-template.service";

@Injectable()
export class SendGridEmailService {
  private readonly logger = new Logger(SendGridEmailService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    const apiKey = this.configService.get("SENDGRID_API_KEY");
    this.isEnabled = !!apiKey;

    if (this.isEnabled) {
      sgMail.setApiKey(apiKey);
      this.logger.log("SendGrid email service initialized");
    } else {
      this.logger.warn("SendGrid API key not found, email sending disabled");
    }
  }

  async sendNotification(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<NotificationResult> {
    if (!this.isEnabled) {
      this.logger.warn("SendGrid is not enabled, skipping email");
      return {
        success: false,
        error: "SendGrid not configured",
        channel: "email",
      };
    }

    try {
      const { subject, html, text } =
        await this.templateService.renderEmailTemplate(type, context);

      const fromEmail = this.configService.get(
        "SENDGRID_FROM_EMAIL",
        "noreply@heyapos.com",
      );
      const fromName = context.merchant.name;

      const msg = {
        to: context.customer.email,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject,
        text,
        html,
        // Optional: Add custom tracking
        customArgs: {
          merchantId: context.merchant.id,
          bookingId: context.booking?.id || "",
          notificationType: type,
        },
        // Optional: Add categories for analytics
        categories: ["transactional", type],
      };

      const [response] = await sgMail.send(msg);
      const messageId = response.headers["x-message-id"] || `sg-${Date.now()}`;

      this.logger.log(`SendGrid email sent successfully: ${messageId}`);
      return {
        success: true,
        messageId,
        channel: "email",
      };
    } catch (error: any) {
      this.logger.error("Failed to send SendGrid email", error);

      // Extract meaningful error from SendGrid response
      let errorMessage = "Unknown error";
      if (error.response?.body?.errors?.[0]?.message) {
        errorMessage = error.response.body.errors[0].message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        channel: "email",
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // SendGrid doesn't have a specific verify endpoint,
      // but we can validate the API key format
      const apiKey = this.configService.get("SENDGRID_API_KEY");
      if (apiKey && apiKey.startsWith("SG.")) {
        this.logger.log("SendGrid API key format is valid");
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error("SendGrid verification failed", error);
      return false;
    }
  }
}
