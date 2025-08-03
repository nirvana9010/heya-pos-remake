# PostgreSQL LISTEN/NOTIFY Implementation Guide

## Overview
This guide documents how to implement PostgreSQL's LISTEN/NOTIFY mechanism for real-time notifications in the Heya POS system after migrating from Supabase to Fly.io PostgreSQL.

## Current Architecture
- **Database**: PostgreSQL on Fly.io (no Supabase Realtime)
- **Current Method**: 60-second polling for notifications
- **Goal**: Real-time notifications using PostgreSQL native features

## Implementation Strategy

### 1. Database Triggers
Create PostgreSQL triggers to emit NOTIFY events when bookings change:

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION notify_booking_changes()
RETURNS trigger AS $$
BEGIN
  -- Emit different events based on operation
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'booking_created',
      json_build_object(
        'id', NEW.id,
        'merchantId', NEW."merchantId",
        'status', NEW.status,
        'operation', TG_OP
      )::text
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM pg_notify(
        'booking_updated',
        json_build_object(
          'id', NEW.id,
          'merchantId', NEW."merchantId",
          'oldStatus', OLD.status,
          'newStatus', NEW.status,
          'operation', TG_OP
        )::text
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify(
      'booking_deleted',
      json_build_object(
        'id', OLD.id,
        'merchantId', OLD."merchantId",
        'operation', TG_OP
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on Booking table
CREATE TRIGGER booking_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION notify_booking_changes();
```

### 2. Backend Implementation (NestJS)

#### A. Create PostgreSQL Listener Service

```typescript
// apps/api/src/notifications/postgres-listener.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostgresListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresListenerService.name);
  private client: Client;
  private reconnectTimeout: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000; // 5 seconds

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.client = new Client({
        connectionString: this.configService.get('DATABASE_URL'),
      });

      this.client.on('notification', (msg) => {
        this.handleNotification(msg);
      });

      this.client.on('error', (err) => {
        this.logger.error('PostgreSQL client error:', err);
        this.scheduleReconnect();
      });

      await this.client.connect();
      
      // Listen to channels
      await this.client.query('LISTEN booking_created');
      await this.client.query('LISTEN booking_updated');
      await this.client.query('LISTEN booking_deleted');
      
      this.logger.log('Connected to PostgreSQL and listening for notifications');
      this.reconnectAttempts = 0;
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.logger.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, this.reconnectDelay);
  }

  private handleNotification(msg: any) {
    try {
      const payload = JSON.parse(msg.payload);
      this.logger.debug(`Received ${msg.channel}:`, payload);
      
      // Emit internal event for other services to handle
      this.eventEmitter.emit(`postgres.${msg.channel}`, payload);
      
      // Emit WebSocket event for real-time updates
      this.eventEmitter.emit('notification.send', {
        channel: msg.channel,
        data: payload,
        merchantId: payload.merchantId,
      });
    } catch (error) {
      this.logger.error('Error handling notification:', error);
    }
  }

  private async disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.client) {
      await this.client.end();
      this.logger.log('Disconnected from PostgreSQL');
    }
  }
}
```

#### B. WebSocket Gateway for Real-time Updates

```typescript
// apps/api/src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://heya-pos-merchant.vercel.app', 'https://heya-pos-booking.vercel.app']
      : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const merchantId = payload.merchantId;
      
      client.data.userId = userId;
      client.data.merchantId = merchantId;
      
      // Join merchant room for merchant-wide notifications
      client.join(`merchant:${merchantId}`);
      
      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);
      
      this.logger.log(`Client connected: ${client.id} (User: ${userId}, Merchant: ${merchantId})`);
      
      // Send connection confirmation
      client.emit('connected', { userId, merchantId });
    } catch (error) {
      this.logger.error('Connection authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('notification.send')
  handleNotificationEvent(payload: any) {
    const { channel, data, merchantId } = payload;
    
    // Send to all clients in the merchant room
    this.server.to(`merchant:${merchantId}`).emit(channel, data);
    
    this.logger.debug(`Sent ${channel} to merchant ${merchantId}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { channel } = data;
    client.join(channel);
    client.emit('subscribed', { channel });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { channel } = data;
    client.leave(channel);
    client.emit('unsubscribed', { channel });
  }
}
```

### 3. Frontend Implementation (React)

#### A. WebSocket Hook

```typescript
// apps/merchant-app/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth/auth-provider';
import { toast } from '@/components/ui/use-toast';

interface WebSocketOptions {
  onBookingCreated?: (data: any) => void;
  onBookingUpdated?: (data: any) => void;
  onBookingDeleted?: (data: any) => void;
  autoReconnect?: boolean;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const { token, merchantId } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: options.autoReconnect !== false,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempt(0);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setReconnectAttempt(prev => prev + 1);
      
      if (reconnectAttempt >= maxReconnectAttempts) {
        toast({
          title: 'Connection Lost',
          description: 'Real-time updates unavailable. Please refresh the page.',
          variant: 'destructive',
        });
      }
    });

    // Subscribe to booking events
    socket.on('booking_created', (data) => {
      console.log('Booking created:', data);
      options.onBookingCreated?.(data);
    });

    socket.on('booking_updated', (data) => {
      console.log('Booking updated:', data);
      options.onBookingUpdated?.(data);
    });

    socket.on('booking_deleted', (data) => {
      console.log('Booking deleted:', data);
      options.onBookingDeleted?.(data);
    });

    socketRef.current = socket;
  }, [token, merchantId, options, reconnectAttempt]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    reconnect: connect,
    disconnect,
  };
}
```

#### B. Integration in Calendar Component

```typescript
// apps/merchant-app/src/components/calendar/refactored/CalendarPage.tsx
import { useWebSocket } from '@/hooks/useWebSocket';

// Inside the component
const { isConnected } = useWebSocket({
  onBookingCreated: (data) => {
    // Add new booking to the calendar
    if (data.merchantId === merchantId) {
      fetchBookings(); // or optimistically add to state
      toast({
        title: 'New Booking',
        description: `A new booking has been created`,
      });
    }
  },
  onBookingUpdated: (data) => {
    // Update existing booking
    if (data.merchantId === merchantId) {
      dispatch({
        type: 'UPDATE_BOOKING',
        payload: {
          id: data.id,
          updates: { status: data.newStatus },
        },
      });
    }
  },
  onBookingDeleted: (data) => {
    // Remove booking from calendar
    if (data.merchantId === merchantId) {
      dispatch({
        type: 'DELETE_BOOKING',
        payload: data.id,
      });
    }
  },
});

// Show connection status
{!isConnected && (
  <div className="bg-yellow-50 border-yellow-200 p-2 text-sm">
    Real-time updates unavailable. Refreshing every 60 seconds.
  </div>
)}
```

### 4. Migration Steps

1. **Add database triggers** (one-time migration)
2. **Deploy backend changes**:
   - Add PostgresListenerService
   - Add NotificationsGateway
   - Update NotificationsModule
3. **Deploy frontend changes**:
   - Add useWebSocket hook
   - Integrate into Calendar and other components
4. **Test thoroughly**:
   - Connection handling
   - Reconnection logic
   - Event delivery
   - Performance impact

### 5. Advantages Over Polling

- **Real-time**: Instant updates instead of 60-second delays
- **Efficient**: No unnecessary API calls
- **Scalable**: PostgreSQL NOTIFY is lightweight
- **Reliable**: Built-in reconnection logic
- **Native**: Uses PostgreSQL's native features

### 6. Considerations

- **Connection Management**: Handle reconnections gracefully
- **Security**: Validate JWT tokens on WebSocket connections
- **Fallback**: Keep polling as fallback for WebSocket failures
- **Monitoring**: Track WebSocket connection health
- **Performance**: NOTIFY payloads should be small (8KB limit)

### 7. Future Enhancements

- Add more event types (payments, customers, etc.)
- Implement presence features (who's online)
- Add typing indicators for chat features
- Create audit log from NOTIFY events
- Add WebSocket compression for better performance