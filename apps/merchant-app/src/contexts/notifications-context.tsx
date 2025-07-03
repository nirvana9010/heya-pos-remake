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

  // Convert notifications data
  const notifications = useMemo(() => {
    if (!notificationsData?.data) return [];
    const converted = notificationsData.data.map(convertNotification);
    
    return converted;
  }, [notificationsData, convertNotification]);

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
    
    console.log('[NotificationsContext] Processing notifications:', {
      total: notifications.length,
      unread: unreadCount,
      prevIds: prevNotificationIdsRef.current.size,
      shownBrowser: shownBrowserNotificationsRef.current.size
    });
    
    // Find new notifications that haven't shown browser alerts yet
    const newNotifications = notifications.filter(n => {
      const isUnread = !n.read;
      const isNew = !prevNotificationIdsRef.current.has(n.id);
      const notShownYet = !shownBrowserNotificationsRef.current.has(n.id);
      
      // Log for debugging
      if (isUnread && !notShownYet) {
        console.log('[NotificationsContext] Checking notification:', {
          id: n.id,
          title: n.title,
          isUnread,
          isNew,
          notShownYet,
          createdAt: n.timestamp || n.createdAt
        });
      }
      
      // A notification should trigger if:
      // 1. It's unread AND
      // 2. We haven't shown a browser notification for it yet AND
      // 3. It's either new OR it was created recently (within last 5 minutes)
      const createdRecently = n.timestamp ? 
        new Date(n.timestamp).getTime() > Date.now() - 5 * 60 * 1000 :
        new Date(n.createdAt).getTime() > Date.now() - 5 * 60 * 1000;
      return isUnread && notShownYet && (isNew || createdRecently);
    });
    
    console.log('[NotificationsContext] New notifications to show:', newNotifications.length);
    
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