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
// import { supabaseRealtime } from '@/lib/services/supabase'; // DISABLED - DO NOT RE-ENABLE WITHOUT EXPLICIT REQUEST
import { featureFlags } from '@/lib/feature-flags';
import { useAuth } from '@/lib/auth/auth-provider';
import { bookingEvents } from '@/lib/services/booking-events';

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
  // Track previous notification IDs
  const prevNotificationIdsRef = React.useRef<Set<string>>(new Set());
  // Track if this is the first load
  const isFirstLoadRef = React.useRef(true);
  
  // Track which notifications we've seen before
  const seenNotificationIdsRef = React.useRef<Set<string>>(new Set());
  
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
      // Failed to load shown notifications
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
    
    // On first load, populate prevNotificationIdsRef to prevent triggering for existing notifications
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      prevNotificationIdsRef.current = new Set(notifications.map(n => n.id));
      // Also mark all existing notifications as "seen" so they don't trigger calendar updates
      notifications.forEach(n => seenNotificationIdsRef.current.add(n.id));
    }
    
    // Find new notifications that haven't shown browser alerts yet
    // Only consider notifications created in the last 5 minutes to avoid
    // spamming the user with stale notifications when returning to the tab
    const newNotifications = notifications.filter(n => {
      const isUnread = !n.read;
      const notShownYet = !shownBrowserNotificationsRef.current.has(n.id);
      const isNew = !prevNotificationIdsRef.current.has(n.id);
      const createdRecently = n.timestamp ?
        new Date(n.timestamp).getTime() > Date.now() - 5 * 60 * 1000 :
        false;
      // Must be unread, not shown yet, new to the client, AND recent
      return isUnread && notShownYet && isNew && createdRecently;
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
      
      // We're no longer broadcasting booking events from notifications
      // Calendar updates are now handled by user activity detection
      
      // Show browser notifications (cap at 3 individual, then summary)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const NotificationAPI = window.Notification as any;
        if (NotificationAPI.permission === 'granted') {
          const MAX_INDIVIDUAL = 3;

          if (newNotifications.length <= MAX_INDIVIDUAL) {
            // Show individual notifications
            newNotifications.forEach(notification => {
              try {
                const tag = notification.metadata?.bookingId || notification.id;
                const browserNotification = new NotificationAPI(notification.title, {
                  body: notification.message,
                  tag: tag,
                  requireInteraction: false,
                  renotify: false,
                });
                browserNotification.onclick = () => {
                  window.focus();
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                  browserNotification.close();
                };
                setTimeout(() => browserNotification.close(), 5000);
              } catch (e) {
                // Ignore notification errors
              }
            });
          } else {
            // Too many - show a single summary notification
            try {
              const browserNotification = new NotificationAPI(
                `${newNotifications.length} new notifications`, {
                body: newNotifications.slice(0, 3).map(n => n.title).join(', ') + '...',
                tag: 'notification-summary',
                requireInteraction: false,
                renotify: true,
              });
              browserNotification.onclick = () => {
                window.focus();
                browserNotification.close();
              };
              setTimeout(() => browserNotification.close(), 5000);
            } catch (e) {
              // Ignore notification errors
            }
          }
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
    
    // Broadcast booking events for calendar updates
    // Only broadcast notifications we haven't seen before
    const newBookingNotifications = notifications.filter(n => 
      !n.read &&
      (n.type === 'booking_new' || n.type === 'booking_modified') && 
      n.metadata?.bookingId &&
      !seenNotificationIdsRef.current.has(n.id)
    );
    
    if (newBookingNotifications.length > 0) {
      // Broadcast each new booking notification
      newBookingNotifications.forEach(notification => {
        console.log('[NotificationContext] Broadcasting booking-updated event for:', {
          notificationId: notification.id,
          bookingId: notification.metadata.bookingId,
          type: notification.type
        });
        
        // Dispatch DOM event (for backwards compatibility)
        const event = new CustomEvent('booking-updated', {
          detail: {
            bookingId: notification.metadata.bookingId,
            type: notification.type,
            timestamp: notification.timestamp
          }
        });
        window.dispatchEvent(event);
        
        // Also broadcast through bookingEvents for calendar updates
        bookingEvents.broadcast({
          type: notification.type === 'booking_new' ? 'booking_created' : 'booking_updated',
          bookingId: notification.metadata.bookingId,
          source: 'external'
        });
        
        // Mark as seen
        seenNotificationIdsRef.current.add(notification.id);
      });
    }
    
    // Update refs ONLY after processing
    prevUnreadCountRef.current = unreadCount;
    // Add ALL current notification IDs to prevNotificationIdsRef
    // This prevents old notifications from re-triggering on subsequent polls
    notifications.forEach(n => {
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
  const { merchant, user, isAuthenticated } = useAuth();

  // SUPABASE DISABLED - Using polling only
  // Notifications will update every 60 seconds via React Query polling
  // This is configured in use-notifications.ts with refetchInterval: 60000
  // DO NOT RE-ENABLE SUPABASE WITHOUT EXPLICIT USER REQUEST


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
      // Failed to mark notification as read
    }
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      // Clear all shown browser notifications
      shownBrowserNotificationsRef.current.clear();
      localStorage.removeItem('shownBrowserNotifications');
    } catch (err) {
      // Failed to mark all notifications as read
    }
  }, [markAllAsReadMutation]);

  const clearNotification = useCallback(async (id: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(id);
    } catch (err) {
      // Failed to delete notification
    }
  }, [deleteNotificationMutation]);

  const clearAll = useCallback(async () => {
    try {
      await deleteAllNotificationsMutation.mutateAsync();
    } catch (err) {
      // Failed to clear all notifications
    }
  }, [deleteAllNotificationsMutation]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // This is a client-side only function for immediate UI feedback
    // Real notifications should come from the server
    
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
      // Failed to refresh notifications
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