'use client';

import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { Notification, getUnreadCount } from '@/lib/notifications';
import { MerchantNotification } from '@/lib/clients/notifications-client';
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useDeleteAllNotifications 
} from '@/lib/query/hooks/use-notifications';

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
  // Use React Query hook for fetching notifications
  const { data: notificationsData, isLoading, error, refetch } = useNotifications();
  
  // Mutation hooks
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteAllNotificationsMutation = useDeleteAllNotifications();

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
    return notificationsData.data.map(convertNotification);
  }, [notificationsData, convertNotification]);

  // Track previous unread count for sound notification
  const prevUnreadCountRef = React.useRef(0);
  
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Play sound for new unread notifications
    if (unreadCount > prevUnreadCountRef.current && 'Audio' in window) {
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
    
    prevUnreadCountRef.current = unreadCount;
  }, [notifications]);

  // Clean up old mock data on mount
  useEffect(() => {
    localStorage.removeItem('merchant-notifications');
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
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
    await refetch();
  }, [refetch]);

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