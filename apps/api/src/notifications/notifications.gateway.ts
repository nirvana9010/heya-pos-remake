import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";

@Injectable()
@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://heya-pos-merchant.vercel.app",
            "https://heya-pos-booking.vercel.app",
          ]
        : [
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:3003",
          ],
    credentials: true,
  },
  // namespace: '/notifications', // Temporarily remove namespace to debug
  transports: ["websocket", "polling"], // Support both transports
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs
  private merchantSockets = new Map<string, Set<string>>(); // merchantId -> Set of socket IDs
  private connectionCount = 0;

  constructor(
    private jwtService: JwtService,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log("🔧 NotificationsGateway constructor called");
  }

  afterInit(server: Server) {
    this.logger.log(
      "🚀 WebSocket Gateway initialized on /notifications namespace",
    );
    this.logger.log(
      `CORS origins: ${process.env.NODE_ENV === "production" ? "Production URLs" : "http://localhost:3001, 3002, 3003"}`,
    );
    this.logger.log(`Server listening for WebSocket connections`);
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from various sources
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(" ")[1] ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(
          `Connection rejected - no token provided from ${client.handshake.address}`,
        );
        client.disconnect();
        return;
      }

      // Verify JWT token
      let payload: any;
      try {
        payload = this.jwtService.verify(token as string);
      } catch (error) {
        this.logger.warn(
          `Connection rejected - invalid token from ${client.handshake.address}`,
        );
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      const merchantId = payload.merchantId;

      // Store user data in socket for later use
      client.data.userId = userId;
      client.data.merchantId = merchantId;
      client.data.userEmail = payload.email;

      // Join merchant room for merchant-wide notifications
      client.join(`merchant:${merchantId}`);

      // Join user-specific room
      client.join(`user:${userId}`);

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Track merchant socket
      if (!this.merchantSockets.has(merchantId)) {
        this.merchantSockets.set(merchantId, new Set());
      }
      this.merchantSockets.get(merchantId).add(client.id);

      this.connectionCount++;

      this.logger.log(
        `✅ Client connected: ${client.id} (User: ${payload.email}, Merchant: ${merchantId}). Total connections: ${this.connectionCount}`,
      );

      // Send connection confirmation with user info
      client.emit("connected", {
        userId,
        merchantId,
        email: payload.email,
        connectionId: client.id,
        timestamp: new Date().toISOString(),
      });

      // Send any pending notifications (optional - implement if needed)
      // this.sendPendingNotifications(userId, merchantId, client);
    } catch (error) {
      this.logger.error("Connection authentication failed:", error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const merchantId = client.data.merchantId;

    // Clean up user sockets
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);

      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Clean up merchant sockets
    if (merchantId && this.merchantSockets.has(merchantId)) {
      this.merchantSockets.get(merchantId).delete(client.id);

      if (this.merchantSockets.get(merchantId).size === 0) {
        this.merchantSockets.delete(merchantId);
      }
    }

    this.connectionCount--;

    this.logger.log(
      `👋 Client disconnected: ${client.id} (User: ${client.data.userEmail}). Total connections: ${this.connectionCount}`,
    );
  }

  @OnEvent("notification.send")
  handleNotificationEvent(payload: any) {
    const { channel, data, merchantId } = payload;

    // Send to all clients in the merchant room
    const room = `merchant:${merchantId}`;
    this.server.to(room).emit(channel, data);

    // Log delivery
    const merchantSocketCount = this.merchantSockets.get(merchantId)?.size || 0;
    this.logger.debug(
      `📤 Sent ${channel} to ${merchantSocketCount} clients in merchant ${merchantId}`,
    );

    // Also emit a generic 'notification' event for clients that listen to all notifications
    this.server.to(room).emit("notification", {
      type: channel,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { channel } = data;

    // Validate channel name
    const allowedChannels = [
      "booking_created",
      "booking_updated",
      "booking_deleted",
      "payment_created",
      "payment_updated",
      "customer_created",
    ];

    if (!allowedChannels.includes(channel)) {
      client.emit("error", { message: `Invalid channel: ${channel}` });
      return;
    }

    // Join the specific channel room
    client.join(channel);
    client.emit("subscribed", { channel, timestamp: new Date().toISOString() });

    this.logger.debug(`Client ${client.id} subscribed to channel: ${channel}`);
  }

  @SubscribeMessage("unsubscribe")
  handleUnsubscribe(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { channel } = data;
    client.leave(channel);
    client.emit("unsubscribed", {
      channel,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `Client ${client.id} unsubscribed from channel: ${channel}`,
    );
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit("pong", { timestamp: new Date().toISOString() });
  }

  // Public methods for health checks and monitoring
  public getConnectionStats() {
    return {
      totalConnections: this.connectionCount,
      uniqueUsers: this.userSockets.size,
      uniqueMerchants: this.merchantSockets.size,
      merchantDetails: Array.from(this.merchantSockets.entries()).map(
        ([merchantId, sockets]) => ({
          merchantId,
          connectionCount: sockets.size,
        }),
      ),
    };
  }

  // Method to send notification to specific user
  public sendToUser(userId: string, event: string, data: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, data);
  }

  // Method to send notification to specific merchant
  public sendToMerchant(merchantId: string, event: string, data: any) {
    const room = `merchant:${merchantId}`;
    this.server.to(room).emit(event, data);
  }

  // Method to broadcast to all connected clients
  public broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
