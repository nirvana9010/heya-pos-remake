'use client';

import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { Notification, getUnreadCount } from '@/lib/notifications';
import { MerchantNotification } from '@/lib/clients/notifications-client';
import { 
  useNotifications as useNotificationsQuery, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useDeleteAllNotifications 
} from '@/lib/query/hooks/use-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/lib/query/hooks/use-bookings';
import { apiClient } from '@/lib/api-client';
import { bookingEvents } from '@/lib/services/booking-events';
import { getSSEClient, isSSESupported, SSENotificationEvent } from '@/lib/services/sse-notifications';
import { supabaseRealtime } from '@/lib/services/supabase';
import { featureFlags } from '@/lib/feature-flags';
import { useAuth } from '@/lib/auth/auth-provider';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // Force re-render when needed
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  // Optimistic notifications for immediate UI updates
  const [optimisticNotifications, setOptimisticNotifications] = React.useState<MerchantNotification[]>([]);
  
  // Use React Query hook for fetching notifications
  const queryResult = useNotificationsQuery();
  const { data: notificationsData, isLoading, error, refetch } = queryResult;
  
  const queryClient = useQueryClient();
  
  // Mutation hooks
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteAllNotificationsMutation = useDeleteAllNotifications();
  
  // Browser notification permission state
  const [notificationPermission, setNotificationPermission] = React.useState<string>('default');

  // Helper function to convert API notification to local format
  const convertNotification = useCallback((apiNotification: MerchantNotification): Notification => ({
    id: apiNotification.id,
    type: apiNotification.type,
    priority: apiNotification.priority,
    title: apiNotification.title,
    message: apiNotification.message,
    timestamp: new Date(apiNotification.createdAt),
    read: apiNotification.read,
    actionUrl: apiNotification.actionUrl,
    actionLabel: apiNotification.actionLabel,
    metadata: apiNotification.metadata,
  }), []);

  // Convert notifications data and merge with optimistic updates
  const notifications = useMemo(() => {
    const apiNotifications = notificationsData?.data || [];
    
    // Convert API notifications
    const converted = apiNotifications.map(convertNotification);
    
    // Add optimistic notifications that aren't already in API data
    const optimisticConverted = optimisticNotifications
      .filter(opt => !apiNotifications.some(api => api.id === opt.id))
      .map(convertNotification);
    
    // Merge and sort by timestamp (newest first)
    return [...optimisticConverted, ...converted].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [notificationsData, convertNotification, optimisticNotifications]);

  // Track previous unread count for sound notification
  const prevUnreadCountRef = React.useRef(0);
  // Initialize with current notification IDs to prevent false positives on first load
  const prevNotificationIdsRef = React.useRef<Set<string>>(
    new Set(notifications.map(n => n.id))
  );
  
  // Track which notifications have shown browser alerts (persist across page loads)
  // Load synchronously to avoid race conditions
  function loadShownNotifications(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    
    try {
      const shownIds = localStorage.getItem('shownBrowserNotifications');
      if (shownIds) {
        const ids = JSON.parse(shownIds);
        
        // Clean up old IDs (keep only last 100)
        if (ids.length > 100) {
          const recentIds = ids.slice(-100);
          localStorage.setItem('shownBrowserNotifications', JSON.stringify(recentIds));
          return new Set(recentIds);
        }
        
        return new Set(ids);
      }
    } catch (e) {
      console.error('[NotificationsContext] Failed to load shown notifications:', e);
    }
    return new Set();
  }
  
  const shownBrowserNotificationsRef = React.useRef<Set<string>>(loadShownNotifications());
  
  // Debounce timer for notification processing
  const notificationDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Check and request browser notification permission
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Check if Notification API is available
    if ('Notification' in window) {
      const NotificationAPI = window.Notification as any;
      setNotificationPermission(NotificationAPI.permission);
      
      // Request permission if not granted or denied
      if (NotificationAPI.permission === 'default') {
        NotificationAPI.requestPermission().then((permission: string) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);
  
  // Process notifications (separated for debouncing)
  const processNotifications = React.useCallback(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const currentIds = new Set(notifications.map(n => n.id));
    
    
    // Find new notifications that haven't shown browser alerts yet
    const newNotifications = notifications.filter(n => {
      const isUnread = !n.read;
      const isNew = !prevNotificationIdsRef.current.has(n.id);
      const notShownYet = !shownBrowserNotificationsRef.current.has(n.id);
      
      
      // A notification should trigger if:
      // 1. It's unread AND
      // 2. We haven't shown a browser notification for it yet AND
      // 3. It's either new OR it was created recently (within last 5 minutes)
      const createdRecently = n.timestamp ? 
        new Date(n.timestamp).getTime() > Date.now() - 5 * 60 * 1000 :
        new Date(n.createdAt).getTime() > Date.now() - 5 * 60 * 1000;
      return isUnread && notShownYet && (isNew || createdRecently);
    });
    
    
    // Play sound and show browser notification for new unread notifications
    if (newNotifications.length > 0) {
      // Play sound
      if ('Audio' in window) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ignore audio play errors
          });
        } catch (e) {
          // Ignore audio errors
        }
      }
      
      // Broadcast booking events for new booking notifications
      newNotifications.forEach(notification => {
        // Check if this is a booking-related notification
        if (notification.type === 'booking_new' && notification.metadata?.bookingId) {
          bookingEvents.broadcast({
            type: 'booking_created',
            bookingId: notification.metadata.bookingId,
            source: 'ONLINE' // Notifications come from ONLINE bookings
          });
        } else if (notification.type === 'booking_updated' && notification.metadata?.bookingId) {
          bookingEvents.broadcast({
            type: 'booking_updated',
            bookingId: notification.metadata.bookingId,
            source: 'ONLINE'
          });
        }
      });
      
      // Show browser notifications
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const NotificationAPI = window.Notification as any;
        if (NotificationAPI.permission === 'granted') {
          newNotifications.forEach(notification => {
            try {
              // Use booking ID as tag to prevent duplicate notifications for same booking
              const tag = notification.metadata?.bookingId || notification.id;
              const browserNotification = new NotificationAPI(notification.title, {
                body: notification.message,
                tag: tag, // Prevents duplicate notifications for same booking
                requireInteraction: false,
                renotify: false, // Don't notify again for same tag
              });
              
              // Handle click on browser notification
              browserNotification.onclick = () => {
                window.focus();
                if (notification.actionUrl) {
                  window.location.href = notification.actionUrl;
                }
                browserNotification.close();
              };
              
              // Auto-close after 5 seconds
              setTimeout(() => browserNotification.close(), 5000);
            } catch (e) {
              // Ignore notification errors (can happen in some browsers)
              console.warn('[NotificationsContext] Failed to show browser notification:', e);
            }
          });
        }
      }
      
      // Mark these notifications as shown
      newNotifications.forEach(n => {
        shownBrowserNotificationsRef.current.add(n.id);
      });
      
      // Save to localStorage
      localStorage.setItem(
        'shownBrowserNotifications', 
        JSON.stringify(Array.from(shownBrowserNotificationsRef.current))
      );
    }
    
    // Update refs ONLY after processing
    prevUnreadCountRef.current = unreadCount;
    // Only add NEW unread notifications that we've processed to prevNotificationIdsRef
    // This ensures we don't miss notifications that arrive between renders
    newNotifications.forEach(n => {
      prevNotificationIdsRef.current.add(n.id);
    });
    // Also add all read notifications to prevent them from triggering sounds
    notifications.filter(n => n.read).forEach(n => {
      prevNotificationIdsRef.current.add(n.id);
    });
    
  }, [notifications]);
  
  // Debounced effect to process notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    // Clear any existing debounce timer
    if (notificationDebounceRef.current) {
      clearTimeout(notificationDebounceRef.current);
    }
    
    // Debounce notification processing by 100ms to prevent rapid updates
    notificationDebounceRef.current = setTimeout(() => {
      processNotifications();
    }, 100);
    
    // Cleanup on unmount
    return () => {
      if (notificationDebounceRef.current) {
        clearTimeout(notificationDebounceRef.current);
      }
    };
  }, [notifications, processNotifications]);

  // Clean up old mock data on mount
  useEffect(() => {
    localStorage.removeItem('merchant-notifications');
  }, []);

  // Get auth context for merchantId
  const { merchant } = useAuth();

  // Real-time connection (SSE or Supabase)
  // Strategy: Real-time systems (SSE/Supabase) handle immediate updates
  // React Query polling (5 min) acts as a fallback for any missed events
  // When a notification arrives via real-time, we use refreshNotifications()
  // to force an immediate database fetch, bypassing the polling interval
  useEffect(() => {
    const useSupabase = featureFlags.isEnabled('supabaseRealtime');
    
    if (useSupabase) {
      console.log('[NotificationsContext] Using Supabase Realtime');
      
      if (!merchant?.id) {
        console.log('[NotificationsContext] No merchantId, skipping Supabase connection');
        return;
      }

      // Initialize Supabase Realtime
      const initSupabase = async () => {
        const initialized = await supabaseRealtime.initialize();
        if (!initialized) {
          console.error('[NotificationsContext] Failed to initialize Supabase, falling back to polling');
          return;
        }

        // Subscribe to notifications
        supabaseRealtime.subscribeToNotifications(
          merchant.id,
          (notification) => {
            console.log('[NotificationsContext] New notification via Supabase:', notification.id);
            
            // Add notification optimistically for immediate UI update
            setOptimisticNotifications(prev => {
              // Don't add if already exists
              if (prev.some(n => n.id === notification.id)) {
                return prev;
              }
              return [notification as MerchantNotification, ...prev];
            });
            
            // Force UI update immediately
            forceUpdate();
            
            // Still refetch in background to sync with server
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            
            // Use refreshNotifications for immediate fetch
            refreshNotifications().then(() => {
              // Clear optimistic notifications after successful fetch
              setOptimisticNotifications([]);
            }).catch(error => {
              console.error('[NotificationsContext] Supabase refresh failed:', error);
            });
          },
          (error) => {
            console.error('[NotificationsContext] Supabase error:', error);
          }
        );
      };

      initSupabase();

      // Cleanup
      return () => {
        console.log('[NotificationsContext] Cleaning up Supabase connection');
        if (merchant?.id) {
          supabaseRealtime.unsubscribeFromNotifications(merchant.id);
        }
      };
    } else {
      // Use SSE (existing implementation)
      if (!isSSESupported()) {
        console.log('[NotificationsContext] SSE not supported, falling back to polling');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('[NotificationsContext] No auth token, skipping SSE connection');
        return;
      }

      const sseClient = getSSEClient();
      
      // Connect to SSE
      sseClient.connect(token);

      // Handle SSE events
      const handleSSEMessage = (event: SSENotificationEvent) => {
        console.log('[NotificationsContext] SSE event:', event.type);

      switch (event.type) {
        case 'notification':
          // New notification received, update optimistically
          if (event.notification) {
            console.log('[NotificationsContext] New notification via SSE:', event.notification.id);
            console.log('[NotificationsContext] Full notification data:', event.notification);
            
            // Add notification optimistically for immediate UI update
            setOptimisticNotifications(prev => {
              // Don't add if already exists
              if (prev.some(n => n.id === event.notification.id)) {
                console.log('[NotificationsContext] Notification already in optimistic list, skipping');
                return prev;
              }
              console.log('[NotificationsContext] Adding to optimistic notifications');
              return [event.notification as MerchantNotification, ...prev];
            });
            
            // Force UI update immediately
            forceUpdate();
            
            // Still refetch in background to sync with server
            console.log('[NotificationsContext] Invalidating queries and refetching...');
            
            // Force immediate refetch bypassing any stale time or intervals
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            
            // Use refreshNotifications which forces immediate fetch
            refreshNotifications().then(() => {
              console.log('[NotificationsContext] Refresh complete');
              console.log('[NotificationsContext] Clearing optimistic notifications');
              // Clear optimistic notifications after successful fetch
              setOptimisticNotifications([]);
            }).catch(error => {
              console.error('[NotificationsContext] Refresh failed:', error);
            });
          }
          break;

        case 'booking_created':
        case 'booking_updated':
          // Booking event received, broadcast it and refetch notifications
          if (event.bookingId) {
            console.log(`[NotificationsContext] ${event.type} via SSE:`, event.bookingId);
            bookingEvents.broadcast({
              type: event.type,
              bookingId: event.bookingId,
              source: event.source || 'ONLINE'
            });
            // Refetch notifications as there might be a new one
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
            refetch();
          }
          break;

        case 'initial':
          // Initial batch of recent notifications
          if (event.notifications && event.notifications.length > 0) {
            console.log('[NotificationsContext] Received initial notifications via SSE:', event.notifications.length);
            // Refetch to sync with server state
            refetch();
          }
          break;

        case 'connected':
          console.log('[NotificationsContext] SSE connected successfully');
          break;

        case 'error':
        case 'reconnecting':
          console.log('[NotificationsContext] SSE connection issue:', event.type);
          break;
      }
    };

      sseClient.on('message', handleSSEMessage);

      // Cleanup on unmount or token change
      return () => {
        console.log('[NotificationsContext] Cleaning up SSE connection');
        sseClient.off('message', handleSSEMessage);
        sseClient.disconnect();
      };
    }
  }, [queryClient, refetch, merchant?.id]);


  // Force update and process notifications when data timestamp changes
  const lastDataTimestampRef = React.useRef(queryResult.dataUpdatedAt);
  useEffect(() => {
    if (queryResult.dataUpdatedAt && queryResult.dataUpdatedAt !== lastDataTimestampRef.current) {
      lastDataTimestampRef.current = queryResult.dataUpdatedAt;
      forceUpdate();
      
      // Immediately process notifications when new data arrives
      // This ensures browser notifications show without waiting for bell click
      if (notifications && notifications.length > 0) {
        // Use a small timeout to ensure state has updated
        setTimeout(() => {
          processNotifications();
        }, 50);
      }
    }
  }, [queryResult.dataUpdatedAt, queryResult.data, forceUpdate, notifications, processNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
      // Remove from shown browser notifications since it's now read
      shownBrowserNotificationsRef.current.delete(id);
      localStorage.setItem(
        'shownBrowserNotifications', 
        JSON.stringify(Array.from(shownBrowserNotificationsRef.current))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      // Clear all shown browser notifications
      shownBrowserNotificationsRef.current.clear();
      localStorage.removeItem('shownBrowserNotifications');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [markAllAsReadMutation]);

  const clearNotification = useCallback(async (id: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [deleteNotificationMutation]);

  const clearAll = useCallback(async () => {
    try {
      await deleteAllNotificationsMutation.mutateAsync();
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
    }
  }, [deleteAllNotificationsMutation]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // This is a client-side only function for immediate UI feedback
    // Real notifications should come from the server
    console.warn('addNotification is deprecated - notifications should come from the server');
    
    // Play notification sound
    if ('Audio' in window) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors
        });
      } catch (e) {
        // Ignore audio errors
      }
    }
    
    // Trigger a refetch to get the latest from server
    refetch();
  }, [refetch]);

  const refreshNotifications = useCallback(async () => {
    // Force an immediate fetch bypassing React Query's optimizations
    try {
      // First invalidate to mark as stale
      await queryClient.invalidateQueries({ 
        queryKey: notificationKeys.all,
        exact: false 
      });
      
      // Then force immediate fetch with fetchQuery
      await queryClient.fetchQuery({
        queryKey: notificationKeys.all,
        queryFn: () => apiClient.notifications.getNotifications(),
        staleTime: 0,
      });
      
      // Also trigger the main query to refetch
      await refetch();
    } catch (error) {
      console.error('[NotificationsContext] Failed to refresh notifications:', error);
    }
  }, [queryClient, refetch]);

  const unreadCount = getUnreadCount(notifications);

  // Transform error to string
  const errorMessage = error ? (error as any).message || 'Failed to load notifications' : null;

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
      addNotification,
      refreshNotifications,
      isLoading,
      error: errorMessage
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}