import { useEffect, useRef, useCallback, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth/auth-provider';
import { useToast } from '@heya-pos/ui';

interface WebSocketOptions {
  onBookingCreated?: (data: any) => void;
  onBookingUpdated?: (data: any) => void;
  onBookingDeleted?: (data: any) => void;
  onPaymentCreated?: (data: any) => void;
  onPaymentUpdated?: (data: any) => void;
  onCustomerCreated?: (data: any) => void;
  onNotification?: (data: any) => void; // Generic notification handler
  autoReconnect?: boolean;
  debug?: boolean;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Date | null>(null);

  // Store options in a ref to avoid re-running effect when callbacks change
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Effect to manage connection lifecycle
  useEffect(() => {
    let checkTokenInterval: NodeJS.Timeout;
    let mounted = true;
    
    const debug = (message: string, ...args: any[]) => {
      // Only log in development mode or when explicitly enabled
      if (optionsRef.current.debug || (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && localStorage.getItem('ws_debug') === 'true')) {
        console.log(`[WebSocket] ${message}`, ...args);
      }
    };
    
    const attemptConnection = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      if (token && !socketRef.current?.connected && mounted) {
        debug('Token found, connecting to WebSocket...');
        
        // Socket.IO connects to the base URL, not the API prefix
        // Dynamically determine API URL based on current window location for Tailscale/network compatibility
        let baseUrl: string;
        if (process.env.NEXT_PUBLIC_API_URL) {
          baseUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
        } else {
          // Use current window location but with API port (3000)
          baseUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
        }
        
        const socket = io(`${baseUrl}`, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        });

        // Connection events
        socket.on('connect', () => {
          if (mounted) {
            debug('Connected successfully');
            setIsConnected(true);
          }
        });

        socket.on('disconnect', (reason) => {
          if (mounted) {
            debug('Disconnected:', reason);
            setIsConnected(false);
          }
        });

        socket.on('connect_error', (error) => {
          if (mounted) {
            debug('Connection error:', error.message);
          }
        });

        // Event handlers
        socket.on('booking_created', (data) => {
          if (mounted) {
            debug('Booking created:', data);
            setLastNotification(new Date());
            optionsRef.current.onBookingCreated?.(data);
          }
        });

        socket.on('booking_updated', (data) => {
          if (mounted) {
            debug('Booking updated:', data);
            setLastNotification(new Date());
            optionsRef.current.onBookingUpdated?.(data);
          }
        });

        socket.on('booking_deleted', (data) => {
          if (mounted) {
            debug('Booking deleted:', data);
            setLastNotification(new Date());
            optionsRef.current.onBookingDeleted?.(data);
          }
        });

        socket.on('payment_created', (data) => {
          if (mounted) {
            debug('Payment created:', data);
            setLastNotification(new Date());
            optionsRef.current.onPaymentCreated?.(data);
          }
        });

        socket.on('payment_updated', (data) => {
          if (mounted) {
            debug('Payment updated:', data);
            setLastNotification(new Date());
            optionsRef.current.onPaymentUpdated?.(data);
          }
        });

        socket.on('customer_created', (data) => {
          if (mounted) {
            debug('Customer created:', data);
            setLastNotification(new Date());
            optionsRef.current.onCustomerCreated?.(data);
          }
        });

        socket.on('notification', (data) => {
          if (mounted) {
            debug('Generic notification:', data);
            setLastNotification(new Date());
            optionsRef.current.onNotification?.(data);
          }
        });

        // Ping/pong for connection health
        const pingInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('ping');
          }
        }, 30000);

        socket.on('pong', (data) => {
          // Silently handle pong responses - no need to log
          // debug('Pong received:', data);
        });

        // Store socket reference
        socketRef.current = socket;
        
        // Store cleanup for ping interval
        socket.on('disconnect', () => {
          clearInterval(pingInterval);
        });
        
        return true;
      } else if (!token) {
        // Silently wait for token
        return false;
      }
      return true; // Already connected
    };
    
    // Try immediate connection
    if (!attemptConnection()) {
      // If no token, check every second until found
      checkTokenInterval = setInterval(() => {
        if (attemptConnection()) {
          clearInterval(checkTokenInterval);
        }
      }, 1000);
    }
    
    return () => {
      mounted = false;
      if (checkTokenInterval) {
        clearInterval(checkTokenInterval);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - run once on mount

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Subscribe to specific channel
  const subscribe = useCallback((channel: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { channel });
    }
  }, []);

  // Unsubscribe from specific channel
  const unsubscribe = useCallback((channel: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { channel });
    }
  }, []);

  // Return connection status and control methods
  return {
    isConnected,
    reconnect,
    disconnect,
    subscribe,
    unsubscribe,
    lastNotification,
    // Expose socket for advanced usage (be careful!)
    socket: socketRef.current,
  };
}

// Export a singleton version for app-wide notifications
let globalSocket: Socket | null = null;

export function getGlobalWebSocket(): Socket | null {
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!token) return null;
  
  if (!globalSocket || !globalSocket.connected) {
    // Socket.IO connects to the base URL, not the API prefix
    // Dynamically determine API URL based on current window location for Tailscale/network compatibility
    let baseUrl: string;
    if (process.env.NEXT_PUBLIC_API_URL) {
      baseUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
    } else {
      // Use current window location but with API port (3000)
      baseUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    
    globalSocket = io(`${baseUrl}`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  
  return globalSocket;
}

export function disconnectGlobalWebSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}