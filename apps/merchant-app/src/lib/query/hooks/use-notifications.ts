import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import { notificationKeys } from './use-bookings';
import React from 'react';

/**
 * Hook to fetch merchant notifications
 */
export function useNotifications(params?: {
  skip?: number;
  take?: number;
  unreadOnly?: boolean;
}) {
  // Use 10-second polling interval for more responsive updates
  // This provides near real-time updates without the complexity of websockets
  const pollingInterval = 10 * 1000; // 10 seconds
  
  // Track if tab is visible
  const [isTabVisible, setIsTabVisible] = React.useState(!document.hidden);
  
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNotifications] Tab visibility changed:', !document.hidden ? 'visible' : 'hidden');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const queryInfo = useQuery({
    queryKey: [...notificationKeys.all, params],
    queryFn: async () => {
      const fetchParams = {
        ...params,
        take: params?.take || 50, // Fetch last 50 notifications by default
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNotifications] Fetching notifications with params:', fetchParams);
        console.log('[useNotifications] Current time:', new Date().toISOString());
      }
      
      const result = await apiClient.notifications.getNotifications(fetchParams);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[useNotifications] Received notifications:', result.data?.length, 'total');
        console.log('[useNotifications] Unread count:', result.unreadCount);
        if (result.data?.length > 0) {
          console.log('[useNotifications] Most recent notification:', {
            id: result.data[0].id,
            createdAt: result.data[0].createdAt,
            type: result.data[0].type,
            read: result.data[0].read
          });
        }
      }
      
      return result;
    },
    staleTime: 0, // Always consider data stale to force fresh fetches
    gcTime: 0, // Don't garbage collect the data
    refetchInterval: pollingInterval, // 10-second polling interval
    refetchIntervalInBackground: true, // KEEP POLLING IN BACKGROUND
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchOnMount: 'always', // Always refetch on mount
    retry: 1,
    retryDelay: 5000,
    structuralSharing: false, // Disable structural sharing to force new object references
    enabled: true, // Always enabled
  });

  return queryInfo;
}

/**
 * Mutation hook to mark a notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      apiClient.notifications.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mutation hook to mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.notifications.markAllAsRead(),
    onSuccess: () => {
      // Invalidate notifications to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mutation hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      apiClient.notifications.deleteNotification(notificationId),
    onSuccess: () => {
      // Invalidate notifications to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mutation hook to delete all notifications
 */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.notifications.deleteAllNotifications(),
    onSuccess: () => {
      // Invalidate notifications to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}