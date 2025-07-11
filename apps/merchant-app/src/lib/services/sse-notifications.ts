import { EventEmitter } from 'events';

export interface SSENotificationEvent {
  type: 'connected' | 'notification' | 'booking_created' | 'booking_updated' | 'initial' | 'heartbeat' | 'error' | 'reconnecting';
  notification?: any;
  notifications?: any[];
  bookingId?: string;
  source?: string;
  timestamp?: Date;
  error?: string;
}

class SSENotificationsClient extends EventEmitter {
  private eventSource: EventSource | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnecting = false;
  private lastEventTime = Date.now();
  private heartbeatCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Check for stale connections every 60 seconds
    this.heartbeatCheckInterval = setInterval(() => {
      this.checkConnection();
    }, 60000);
  }

  connect(token: string) {
    
    if (this.isConnecting || this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.cleanup();

    try {
      // Use local API route that proxies to backend
      // This avoids issues with Next.js rewrites not handling SSE properly
      const sseUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.lastEventTime = Date.now();
      };

      this.eventSource.onmessage = (event) => {
        try {
          this.lastEventTime = Date.now();
          const data = JSON.parse(event.data);
          
          // Emit the event
          this.emit('message', data);

          // Also emit specific event types
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', {
          readyState: this.eventSource?.readyState,
          readyStateText: this.eventSource?.readyState === 0 ? 'CONNECTING' : 
                         this.eventSource?.readyState === 1 ? 'OPEN' : 
                         this.eventSource?.readyState === 2 ? 'CLOSED' : 'UNKNOWN',
          url: sseUrl.replace(token, 'TOKEN_HIDDEN'),
          error: error
        });
        this.isConnecting = false;

        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.cleanup();
          this.scheduleReconnect(token);
        }

        // Emit error event
        this.emit('message', {
          type: 'error',
          error: 'Connection lost',
          timestamp: new Date(),
        } as SSENotificationEvent);
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      this.isConnecting = false;
      this.scheduleReconnect(token);
    }
  }

  private checkConnection() {
    // If we haven't received any event (including heartbeats) in 90 seconds, reconnect
    const now = Date.now();
    const timeSinceLastEvent = now - this.lastEventTime;
    
    if (this.eventSource && timeSinceLastEvent > 90000) {
      this.disconnect();
      // The error handler will trigger reconnection
    }
  }

  private scheduleReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] Max reconnection attempts reached');
      this.emit('message', {
        type: 'error',
        error: 'Max reconnection attempts reached',
        timestamp: new Date(),
      } as SSENotificationEvent);
      return;
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);


    this.emit('message', {
      type: 'reconnecting',
      timestamp: new Date(),
    } as SSENotificationEvent);

    this.reconnectTimer = setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  disconnect() {
    this.cleanup();
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear heartbeat check
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }

    // Reset state
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  private cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      return false;
    }
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  getConnectionState(): any {
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      return { readyState: 'server-side', reconnectAttempts: 0, maxReconnectAttempts: 10 };
    }
    
    if (!this.eventSource) {
      return { 
        readyState: 'disconnected',
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        lastEventTime: this.lastEventTime
      };
    }
    
    let readyState = 'unknown';
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        readyState = 'connecting';
        break;
      case EventSource.OPEN:
        readyState = 'connected';
        break;
      case EventSource.CLOSED:
        readyState = 'closed';
        break;
    }
    
    return {
      readyState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastEventTime: this.lastEventTime
    };
  }
}

// Singleton instance
let sseClient: SSENotificationsClient | null = null;

export function getSSEClient(): SSENotificationsClient {
  if (!sseClient) {
    sseClient = new SSENotificationsClient();
  }
  return sseClient;
}

// Helper to check if SSE is supported
export function isSSESupported(): boolean {
  return typeof window !== 'undefined' && 'EventSource' in window;
}