import {
  Controller,
  Get,
  Query,
  Res,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../auth/decorators/public.decorator';
import { MerchantNotificationsService } from '../merchant-notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

interface SSEClient {
  id: string;
  merchantId: string;
  response: Response;
  lastHeartbeat: Date;
}

@Controller('merchant/notifications')
export class NotificationsSseController {
  private readonly logger = new Logger(NotificationsSseController.name);
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
    private readonly notificationsService: MerchantNotificationsService,
    private readonly prisma: PrismaService,
  ) {
    // Start heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats();
    }, 30000); // 30 seconds

    // Subscribe to booking events
    this.setupEventListeners();
  }

  @Public() // We'll handle auth manually for SSE
  @Get('stream')
  async stream(@Query('token') token: string, @Res() res: Response) {
    try {
      // Validate token
      if (!token) {
        throw new BadRequestException('Token is required');
      }

      // Decode and verify JWT token
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const merchantId = payload.merchantId;
      const authId = payload.sub;
      const authType = payload.type || 'staff';

      if (!merchantId || !authId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Verify authentication based on type
      if (authType === 'merchant') {
        // For merchant auth, verify the merchant auth record
        const merchantAuth = await this.prisma.merchantAuth.findFirst({
          where: {
            id: authId,
            merchantId: merchantId,
          },
        });

        if (!merchantAuth) {
          throw new UnauthorizedException('Merchant authentication not found');
        }
      } else {
        // For staff auth, verify staff belongs to merchant
        const staff = await this.prisma.staff.findFirst({
          where: {
            id: authId,
            merchantId: merchantId,
            status: 'ACTIVE',
          },
        });

        if (!staff) {
          throw new UnauthorizedException('Staff not found or inactive');
        }
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
        'Access-Control-Allow-Origin': '*', // Allow CORS
        'Access-Control-Allow-Credentials': 'true',
      });

      // Send immediate response to establish connection
      res.write(':ok\n\n');
      res.flushHeaders();

      // Create client
      const clientId = `${merchantId}-${authId}-${Date.now()}`;
      const client: SSEClient = {
        id: clientId,
        merchantId,
        response: res,
        lastHeartbeat: new Date(),
      };

      this.clients.set(clientId, client);
      this.logger.log(`SSE client connected: ${clientId}`);

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`);

      // Send any recent notifications (last 5 minutes)
      const recentNotifications = await this.notificationsService.getNotifications(merchantId, {
        skip: 0,
        take: 10,
      });

      if (recentNotifications.data.length > 0) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const veryRecent = recentNotifications.data.filter(
          n => new Date(n.createdAt) > fiveMinutesAgo
        );
        
        if (veryRecent.length > 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'initial', 
            notifications: veryRecent 
          })}\n\n`);
        }
      }

      // Handle client disconnect
      res.on('close', () => {
        this.clients.delete(clientId);
        this.logger.log(`SSE client disconnected: ${clientId}`);
      });

      res.on('error', () => {
        this.clients.delete(clientId);
        this.logger.log(`SSE client error: ${clientId}`);
      });

    } catch (error) {
      this.logger.error('SSE connection error:', error);
      res.status((error as any).status || 500).json({
        message: (error as any).message || 'Internal server error',
      });
    }
  }

  private setupEventListeners() {
    // Listen for booking created events
    this.eventEmitter.on('booking.created', async (event: any) => {
      this.logger.log(`Received booking.created event for merchant ${event.merchantId}`);
      await this.handleBookingEvent(event, 'booking_created');
    });

    // Listen for booking updated events
    this.eventEmitter.on('booking.updated', async (event: any) => {
      this.logger.log(`Received booking.updated event for merchant ${event.merchantId}`);
      await this.handleBookingEvent(event, 'booking_updated');
    });

    // Listen for notification created events (if you emit these)
    this.eventEmitter.on('notification.created', async (event: any) => {
      this.logger.log(`Received notification.created event for merchant ${event.merchantId}`);
      await this.sendToMerchantClients(event.merchantId, {
        type: 'notification',
        notification: event.notification,
        timestamp: new Date(),
      });
    });
  }

  private async handleBookingEvent(event: any, type: string) {
    const merchantId = event.merchantId;
    
    // Fetch the latest notification for this booking
    try {
      const notifications = await this.notificationsService.getNotifications(merchantId, {
        skip: 0,
        take: 5,
      });

      // Find the notification for this booking
      const bookingNotification = notifications.data.find(
        n => (n.metadata as any)?.bookingId === event.bookingId
      );

      if (bookingNotification) {
        await this.sendToMerchantClients(merchantId, {
          type: 'notification',
          notification: bookingNotification,
          timestamp: new Date(),
        });
      } else {
        // Send booking event even without notification
        await this.sendToMerchantClients(merchantId, {
          type,
          bookingId: event.bookingId,
          source: event.source || 'ONLINE',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error handling booking event: ${(error as any).message}`);
    }
  }

  private async sendToMerchantClients(merchantId: string, data: any) {
    const merchantClients = Array.from(this.clients.values()).filter(
      client => client.merchantId === merchantId
    );

    if (merchantClients.length === 0) {
      return;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;

    for (const client of merchantClients) {
      try {
        client.response.write(message);
        client.lastHeartbeat = new Date();
      } catch (error) {
        this.logger.error(`Error sending to client ${client.id}:`, error);
        this.clients.delete(client.id);
      }
    }

    this.logger.log(`Sent ${data.type} to ${merchantClients.length} clients for merchant ${merchantId}`);
  }

  private sendHeartbeats() {
    const now = new Date();
    const heartbeatMessage = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: now })}\n\n`;

    for (const [clientId, client] of this.clients) {
      try {
        client.response.write(heartbeatMessage);
        client.lastHeartbeat = now;
      } catch (error) {
        this.logger.error(`Error sending heartbeat to client ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  onModuleDestroy() {
    // Clean up on shutdown
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const [clientId, client] of this.clients) {
      try {
        client.response.end();
      } catch (error) {
        // Ignore errors on cleanup
      }
    }

    this.clients.clear();
  }
}