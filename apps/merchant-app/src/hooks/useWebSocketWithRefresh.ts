import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api-client';
import { resolveApiBaseUrl } from '@/lib/clients/base-client';

interface WebSocketOptions {
  debug?: boolean;
  onConnected?: (data: any) => void;
  onDisconnected?: (reason: string) => void;
  onBookingCreated?: (data: any) => void;
  onBookingUpdated?: (data: any) => void;
  onBookingDeleted?: (data: any) => void;
  onPaymentCreated?: (data: any) => void;
  onPaymentUpdated?: (data: any) => void;
  onCustomerCreated?: (data: any) => void;
  onNotification?: (data: any) => void;
}

/**
 * Enhanced WebSocket hook with automatic token refresh
 * Handles JWT expiration gracefully
 */
export function useWebSocketWithRefresh(options: WebSocketOptions = {}) {
  const { user, refreshAccessToken } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Date | null>(null);
  
  // Store options in ref to avoid re-running effect when callbacks change
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Track reconnection attempts with exponential backoff
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseDelay = 500; // Base delay in ms for exponential backoff
  
  useEffect(() => {
    let mounted = true;
    let checkTokenInterval: NodeJS.Timeout;
    let tokenRefreshTimeout: NodeJS.Timeout;
    
    const debug = (message: string, ...args: any[]) => {
      if (optionsRef.current.debug || (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && localStorage.getItem('ws_debug') === 'true')) {
        console.log(`[WebSocket] ${message}`, ...args);
      }
    };
    
    const connectWithToken = (token: string) => {
      if (!mounted || socketRef.current?.connected) return;
      
      debug('Connecting with token...');
      
      const baseUrl = resolveApiBaseUrl().replace('/api', '');
      
      const socket = io(`${baseUrl}/notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });
      
      socket.on('connect', () => {
        if (mounted) {
          debug('Connected successfully');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset on successful connection
          optionsRef.current.onConnected?.({ timestamp: new Date().toISOString() });
        }
      });
      
      socket.on('disconnect', (reason) => {
        if (mounted) {
          debug('Disconnected:', reason);
          setIsConnected(false);
          optionsRef.current.onDisconnected?.(reason);
          
          // If disconnected due to "io server disconnect" (usually auth failure)
          // and we haven't exceeded max attempts, try refreshing token
          if (reason === 'io server disconnect' && reconnectAttemptsRef.current < maxReconnectAttempts) {
            debug('Server disconnected us, attempting token refresh...');
            handleTokenRefresh();
          }
        }
      });
      
      socket.on('connect_error', (error) => {
        if (mounted) {
          debug('Connection error:', error.message);
          
          // Check if error is auth-related
          if (error.message.includes('jwt') || error.message.includes('token') || error.message.includes('auth')) {
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              debug('Auth error detected, attempting token refresh...');
              handleTokenRefresh();
            } else {
              debug('Max token refresh attempts reached, giving up');
            }
          }
        }
      });
      
      // Set up event listeners
      socket.on('connected', (data) => {
        if (mounted) {
          debug('Received connected event:', data);
          optionsRef.current.onConnected?.(data);
        }
      });
      
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
        // Silently handle pong
      });
      
      // Store socket reference
      socketRef.current = socket;
      
      // Cleanup ping interval on disconnect
      socket.on('disconnect', () => {
        clearInterval(pingInterval);
      });
    };
    
    const handleTokenRefresh = async () => {
      const attempt = reconnectAttemptsRef.current;
      
      if (attempt >= maxReconnectAttempts) {
        debug(`Max token refresh attempts (${maxReconnectAttempts}) reached, giving up`);
        return;
      }
      
      reconnectAttemptsRef.current++;
      debug(`Token refresh attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
      
      // Clear any existing timeout
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
      
      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      try {
        // Try to refresh the token
        const newToken = await refreshAccessToken();
        if (newToken && mounted) {
          debug('Token refreshed successfully, reconnecting...');
          // Wait a bit before reconnecting
          tokenRefreshTimeout = setTimeout(() => {
            if (mounted) {
              connectWithToken(newToken);
            }
          }, 1000);
        } else {
          debug('Token refresh failed');
          scheduleRetryWithBackoff();
        }
      } catch (error) {
        debug('Error refreshing token:', error);
        scheduleRetryWithBackoff();
      }
    };
    
    const scheduleRetryWithBackoff = () => {
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        debug('Max attempts reached, not scheduling retry');
        return;
      }
      
      // Exponential backoff with jitter
      const attempt = reconnectAttemptsRef.current;
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        30000 // Max 30 seconds
      );
      
      debug(`Scheduling retry in ${Math.round(delay / 1000)}s`);
      
      tokenRefreshTimeout = setTimeout(() => {
        if (mounted) {
          handleTokenRefresh();
        }
      }, delay);
    };
    
    const attemptConnection = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      if (token && !socketRef.current?.connected && mounted) {
        connectWithToken(token);
        return true;
      } else if (!token) {
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
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array
  
  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    
    // Reset and try to connect again
    reconnectAttemptsRef.current = 0;
    const token = localStorage.getItem('access_token');
    if (token) {
      const baseUrl = resolveApiBaseUrl().replace('/api', '');
      const socket = io(`${baseUrl}/notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = socket;
    }
  }, []);
  
  // Send custom event
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);
  
  return {
    isConnected,
    lastNotification,
    reconnect,
    emit,
    socket: socketRef.current,
  };
}
