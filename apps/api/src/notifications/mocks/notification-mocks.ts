/**
 * Mock implementations for notification services
 * These mocks are used during development and testing
 * They will be replaced with real implementations when API keys are acquired
 */

import { Logger } from "@nestjs/common";

/**
 * Mock SendGrid Email Provider
 * Simulates SendGrid API responses for development
 */
export class MockSendGridProvider {
  private readonly logger = new Logger("MockSendGrid");

  constructor(private apiKey?: string) {
    this.logger.log("Mock SendGrid provider initialized");
  }

  async send(emailData: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
  }) {
    this.logger.log(`[MOCK] Sending email via SendGrid:
      To: ${emailData.to}
      From: ${emailData.from}
      Subject: ${emailData.subject}
    `);

    // Simulate API delay
    await this.simulateDelay();

    // Simulate different responses based on email
    if (emailData.to.includes("fail@")) {
      throw new Error("SendGrid: Invalid recipient address");
    }

    if (emailData.to.includes("bounce@")) {
      return {
        statusCode: 400,
        body: "Email bounced",
        headers: {},
      };
    }

    // Success response
    return {
      statusCode: 202,
      body: "",
      headers: {
        "x-message-id": `mock-sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };
  }

  async verifyConnection(): Promise<boolean> {
    this.logger.log("[MOCK] Verifying SendGrid connection");
    await this.simulateDelay(100);
    return true;
  }

  private async simulateDelay(ms: number = 200) {
    if (process.env.MOCK_DELAY !== "false") {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
}

/**
 * Mock Twilio SMS Provider
 * Simulates Twilio API responses for development
 */
export class MockTwilioProvider {
  private readonly logger = new Logger("MockTwilio");

  constructor(
    private accountSid?: string,
    private authToken?: string,
    private fromNumber?: string,
  ) {
    this.logger.log("Mock Twilio provider initialized");
  }

  async sendMessage(to: string, body: string) {
    this.logger.log(`[MOCK] Sending SMS via Twilio:
      To: ${to}
      Body: ${body.substring(0, 50)}...
      Length: ${body.length} characters
    `);

    // Simulate API delay
    await this.simulateDelay();

    // Validate phone number format
    if (!to.match(/^\+\d{10,15}$/)) {
      throw new Error("Twilio: Invalid phone number format");
    }

    // Simulate different responses based on phone number
    if (to.includes("00000")) {
      throw new Error("Twilio: Undeliverable phone number");
    }

    if (to.includes("99999")) {
      return {
        sid: `mock-fail-${Date.now()}`,
        status: "failed",
        errorCode: 21211,
        errorMessage: "Invalid phone number",
      };
    }

    // Check message length (Twilio limit is 1600 characters)
    if (body.length > 1600) {
      throw new Error("Twilio: Message body too long");
    }

    // Success response
    return {
      sid: `mock-twilio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "sent",
      dateCreated: new Date().toISOString(),
      dateSent: new Date().toISOString(),
      to,
      from: this.fromNumber || "+61400000000",
      body,
      numSegments: Math.ceil(body.length / 160),
      direction: "outbound-api",
      price: "0.075",
      priceUnit: "USD",
    };
  }

  async verifyConnection(): Promise<boolean> {
    this.logger.log("[MOCK] Verifying Twilio connection");
    await this.simulateDelay(100);
    return true;
  }

  private async simulateDelay(ms: number = 300) {
    if (process.env.MOCK_DELAY !== "false") {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
}

/**
 * Mock Email Transport for nodemailer
 * Can be used as a drop-in replacement for SMTP transport
 */
export class MockEmailTransport {
  private readonly logger = new Logger("MockEmailTransport");
  private sentEmails: any[] = [];

  async sendMail(mailOptions: any) {
    this.logger.log(`[MOCK] Sending email:
      From: ${mailOptions.from}
      To: ${mailOptions.to}
      Subject: ${mailOptions.subject}
    `);

    // Store sent email for testing
    this.sentEmails.push({
      ...mailOptions,
      timestamp: new Date(),
      messageId: `mock-email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    // Simulate failures based on recipient
    if (mailOptions.to?.includes("fail@")) {
      throw new Error("SMTP: Connection refused");
    }

    if (mailOptions.to?.includes("timeout@")) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      throw new Error("SMTP: Connection timeout");
    }

    // Return success
    return {
      messageId: this.sentEmails[this.sentEmails.length - 1].messageId,
      accepted: [mailOptions.to],
      rejected: [],
      response: "250 Message accepted",
    };
  }

  async verify() {
    this.logger.log("[MOCK] Verifying SMTP connection");
    return true;
  }

  getSentEmails() {
    return this.sentEmails;
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}

/**
 * Development notification dashboard data
 * Provides a simple way to view sent notifications in development
 */
export class NotificationDashboard {
  private static instance: NotificationDashboard;
  private notifications: any[] = [];

  static getInstance() {
    if (!NotificationDashboard.instance) {
      NotificationDashboard.instance = new NotificationDashboard();
    }
    return NotificationDashboard.instance;
  }

  addNotification(type: "email" | "sms", data: any) {
    this.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      ...data,
    });

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(-100);
    }
  }

  getNotifications(type?: "email" | "sms") {
    if (type) {
      return this.notifications.filter((n) => n.type === type);
    }
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }

  getStats() {
    const total = this.notifications.length;
    const emails = this.notifications.filter((n) => n.type === "email").length;
    const sms = this.notifications.filter((n) => n.type === "sms").length;
    const successful = this.notifications.filter((n) => n.success).length;
    const failed = this.notifications.filter((n) => !n.success).length;

    return {
      total,
      emails,
      sms,
      successful,
      failed,
      successRate:
        total > 0 ? ((successful / total) * 100).toFixed(2) + "%" : "0%",
    };
  }
}

/**
 * Mock webhook receiver for testing notification callbacks
 */
export class MockWebhookReceiver {
  private readonly logger = new Logger("MockWebhookReceiver");
  private webhooks: any[] = [];

  async handleSendGridWebhook(data: any) {
    this.logger.log("[MOCK] Received SendGrid webhook", data);
    this.webhooks.push({
      provider: "sendgrid",
      timestamp: new Date(),
      data,
    });
  }

  async handleTwilioWebhook(data: any) {
    this.logger.log("[MOCK] Received Twilio webhook", data);
    this.webhooks.push({
      provider: "twilio",
      timestamp: new Date(),
      data,
    });
  }

  getWebhooks(provider?: string) {
    if (provider) {
      return this.webhooks.filter((w) => w.provider === provider);
    }
    return this.webhooks;
  }

  clearWebhooks() {
    this.webhooks = [];
  }
}

/**
 * Environment-aware provider factory
 * Returns mock or real providers based on configuration
 */
export class NotificationProviderFactory {
  static createEmailProvider(config: any) {
    const logger = new Logger("NotificationProviderFactory");

    if (
      config.EMAIL_PROVIDER === "sendgrid" &&
      config.SENDGRID_API_KEY &&
      !config.USE_MOCKS
    ) {
      logger.log("Creating real SendGrid provider");
      // TODO: Return real SendGrid provider when implemented
      // return new SendGridProvider(config.SENDGRID_API_KEY);
    }

    logger.log("Creating mock SendGrid provider");
    return new MockSendGridProvider(config.SENDGRID_API_KEY);
  }

  static createSmsProvider(config: any) {
    const logger = new Logger("NotificationProviderFactory");

    if (
      config.SMS_PROVIDER === "twilio" &&
      config.TWILIO_ACCOUNT_SID &&
      !config.USE_MOCKS
    ) {
      logger.log("Creating real Twilio provider");
      // TODO: Return real Twilio provider when implemented
      // return new TwilioProvider(
      //   config.TWILIO_ACCOUNT_SID,
      //   config.TWILIO_AUTH_TOKEN,
      //   config.TWILIO_PHONE_NUMBER,
      // );
    }

    logger.log("Creating mock Twilio provider");
    return new MockTwilioProvider(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN,
      config.TWILIO_PHONE_NUMBER,
    );
  }
}

// Export a function to log mock notification for development UI
export function logMockNotification(type: "email" | "sms", details: any) {
  const dashboard = NotificationDashboard.getInstance();
  dashboard.addNotification(type, details);

  // Also log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[MOCK ${type.toUpperCase()}]`,
      JSON.stringify(details, null, 2),
    );
  }
}
