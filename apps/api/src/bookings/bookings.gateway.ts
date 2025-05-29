import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { BookingsService } from './bookings.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'bookings',
})
export class BookingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { merchantId: string; userId: string }>();

  constructor(private readonly bookingsService: BookingsService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from query or auth header
      const token = client.handshake.query.token || client.handshake.auth.token;
      
      if (!token) {
        client.disconnect();
        return;
      }

      // TODO: Verify JWT token and extract user info
      // For now, we'll use a placeholder
      const merchantId = client.handshake.query.merchantId as string;
      const userId = client.handshake.query.userId as string;

      if (!merchantId) {
        client.disconnect();
        return;
      }

      // Store client info
      this.connectedClients.set(client.id, { merchantId, userId });

      // Join merchant room
      client.join(`merchant:${merchantId}`);

      console.log(`Client ${client.id} connected to merchant ${merchantId}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      client.leave(`merchant:${clientInfo.merchantId}`);
      this.connectedClients.delete(client.id);
      console.log(`Client ${client.id} disconnected`);
    }
  }

  @SubscribeMessage('subscribe:calendar')
  async handleCalendarSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { date: string; view: 'day' | 'week'; staffId?: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    // Join calendar room for specific date/view
    const room = `calendar:${clientInfo.merchantId}:${data.date}:${data.view}`;
    client.join(room);

    // Send initial calendar data
    const calendarData = await this.bookingsService.getCalendarView(
      clientInfo.merchantId,
      data,
    );

    client.emit('calendar:data', calendarData);
  }

  @SubscribeMessage('unsubscribe:calendar')
  handleCalendarUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { date: string; view: 'day' | 'week' },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    const room = `calendar:${clientInfo.merchantId}:${data.date}:${data.view}`;
    client.leave(room);
  }

  // Emit booking events to relevant clients
  emitBookingCreated(merchantId: string, booking: any) {
    this.server.to(`merchant:${merchantId}`).emit('booking:created', booking);
    
    // Emit to specific calendar rooms
    const bookingDate = new Date(booking.startTime);
    const dateStr = bookingDate.toISOString().split('T')[0];
    
    this.server.to(`calendar:${merchantId}:${dateStr}:day`).emit('booking:created', booking);
    
    // Also emit to week view if applicable
    const weekRoom = this.getWeekRoom(merchantId, bookingDate);
    this.server.to(weekRoom).emit('booking:created', booking);
  }

  emitBookingUpdated(merchantId: string, booking: any) {
    this.server.to(`merchant:${merchantId}`).emit('booking:updated', booking);
    
    const bookingDate = new Date(booking.startTime);
    const dateStr = bookingDate.toISOString().split('T')[0];
    
    this.server.to(`calendar:${merchantId}:${dateStr}:day`).emit('booking:updated', booking);
    
    const weekRoom = this.getWeekRoom(merchantId, bookingDate);
    this.server.to(weekRoom).emit('booking:updated', booking);
  }

  emitBookingDeleted(merchantId: string, bookingId: string, booking: any) {
    this.server.to(`merchant:${merchantId}`).emit('booking:deleted', { id: bookingId, booking });
    
    const bookingDate = new Date(booking.startTime);
    const dateStr = bookingDate.toISOString().split('T')[0];
    
    this.server.to(`calendar:${merchantId}:${dateStr}:day`).emit('booking:deleted', { id: bookingId });
    
    const weekRoom = this.getWeekRoom(merchantId, bookingDate);
    this.server.to(weekRoom).emit('booking:deleted', { id: bookingId });
  }

  private getWeekRoom(merchantId: string, date: Date): string {
    // Get Monday of the week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekStr = monday.toISOString().split('T')[0];
    
    return `calendar:${merchantId}:${weekStr}:week`;
  }
}