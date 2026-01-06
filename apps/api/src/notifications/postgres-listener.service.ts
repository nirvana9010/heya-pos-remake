import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Client } from "pg";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PostgresListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresListenerService.name);
  private client: Client;
  private reconnectTimeout: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000; // 5 seconds
  private isConnected = false;
  private lastNotificationTime: Date | null = null;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log("🔧 PostgresListenerService constructor called");
  }

  async onModuleInit() {
    this.logger.log("📡 PostgresListenerService initializing...");
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      // Parse the database URL
      const databaseUrl = this.configService.get("DATABASE_URL");
      if (!databaseUrl) {
        this.logger.error("DATABASE_URL not configured");
        return;
      }

      this.client = new Client({
        connectionString: databaseUrl,
      });

      // Set up event handlers before connecting
      this.client.on("notification", (msg) => {
        this.handleNotification(msg);
      });

      this.client.on("error", (err) => {
        this.logger.error("PostgreSQL client error:", err);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.client.on("end", () => {
        this.logger.warn("PostgreSQL connection closed");
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Connect to the database
      await this.client.connect();
      this.isConnected = true;

      // Listen to channels for booking events
      await this.client.query("LISTEN booking_created");
      await this.client.query("LISTEN booking_updated");
      await this.client.query("LISTEN booking_deleted");

      // Listen to payment events
      await this.client.query("LISTEN payment_created");
      await this.client.query("LISTEN payment_updated");

      // Listen to customer events
      await this.client.query("LISTEN customer_created");

      this.logger.log(
        "✅ Connected to PostgreSQL and listening for notifications",
      );
      this.logger.log(
        "Listening on channels: booking_created, booking_updated, booking_deleted, payment_created, payment_updated, customer_created",
      );
      this.reconnectAttempts = 0;
    } catch (error) {
      this.logger.error("Failed to connect to PostgreSQL:", error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`,
      );
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000); // Max 30 seconds

    this.logger.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.logger.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );
      this.connect();
    }, delay);
  }

  private handleNotification(msg: any) {
    try {
      this.lastNotificationTime = new Date();

      // Parse the payload
      const payload = JSON.parse(msg.payload);

      this.logger.log(`📨 Received ${msg.channel} notification:`, {
        channel: msg.channel,
        merchantId: payload.merchantId,
        id: payload.id,
        timestamp: payload.timestamp,
      });

      // Emit internal event for other services to handle
      // This allows other NestJS services to react to database changes
      this.eventEmitter.emit(`postgres.${msg.channel}`, payload);

      // Emit WebSocket event for real-time updates to clients
      // The NotificationsGateway will handle broadcasting to connected clients
      this.eventEmitter.emit("notification.send", {
        channel: msg.channel,
        data: payload,
        merchantId: payload.merchantId,
      });

      // Log specific event types for debugging
      switch (msg.channel) {
        case "booking_created":
          this.logger.log(
            `New booking created: ${payload.id} for merchant ${payload.merchantId}`,
          );
          break;
        case "booking_updated":
          if (payload.oldStatus !== payload.status) {
            this.logger.log(
              `Booking ${payload.id} status changed: ${payload.oldStatus} → ${payload.status}`,
            );
          }
          break;
        case "booking_deleted":
          this.logger.log(`Booking deleted: ${payload.id}`);
          break;
        case "payment_created":
          this.logger.log(
            `New payment: ${payload.id} for booking ${payload.bookingId}`,
          );
          break;
        case "customer_created":
          this.logger.log(
            `New customer registered: ${payload.firstName} ${payload.lastName || ""}`,
          );
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error handling notification from channel ${msg.channel}:`,
        error,
      );
    }
  }

  private async disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client && this.isConnected) {
      try {
        // Unlisten from all channels
        await this.client.query("UNLISTEN *");
        await this.client.end();
        this.logger.log("Disconnected from PostgreSQL");
      } catch (error) {
        this.logger.error("Error during disconnect:", error);
      }
    }

    this.isConnected = false;
  }

  // Public methods for health checks
  public getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastNotification: this.lastNotificationTime,
    };
  }

  // Method to manually trigger reconnection (useful for testing)
  public async reconnect() {
    this.logger.log("Manual reconnection requested");
    await this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}
