import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import {
  NotificationContext,
  NotificationResult,
  NotificationType,
} from "../interfaces/notification.interface";
import { EmailTemplateService } from "../templates/email-template.service";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    // For MVP, using SMTP configuration
    // In production, use SendGrid/SES/Mailgun
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("EMAIL_HOST", "smtp.gmail.com"),
      port: this.configService.get("EMAIL_PORT", 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get("EMAIL_USER"),
        pass: this.configService.get("EMAIL_PASS"),
      },
    });
  }

  async sendNotification(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<NotificationResult> {
    try {
      const { subject, html, text } =
        await this.templateService.renderEmailTemplate(type, context);

      const fromEmail = this.configService.get(
        "EMAIL_FROM",
        "noreply@heyapos.com",
      );
      const fromName = context.merchant.name;

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: context.customer.email,
        subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        channel: "email",
      };
    } catch (error) {
      this.logger.error("Failed to send email", error);
      return {
        success: false,
        error: (error as Error).message,
        channel: "email",
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log("Email server connection verified");
      return true;
    } catch (error) {
      this.logger.error("Email server connection failed", error);
      return false;
    }
  }
}
