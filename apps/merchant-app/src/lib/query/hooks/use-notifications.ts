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
  const queryInfo = useQuery({
    queryKey: [...notificationKeys.all, params],
    queryFn: async () => {
      console.log('[useNotifications] Fetching notifications...', new Date().toISOString());
      const result = await apiClient.notifications.getNotifications(params);
      console.log('[useNotifications] Fetched notifications:', {
        count: result.data.length,
        unreadCount: result.unreadCount,
        timestamp: new Date().toISOString()
      });
      return result;
    },
    staleTime: 0, // Always consider data stale to force fresh fetches
    gcTime: 0, // Don't garbage collect the data (renamed from cacheTime in v5)
    refetchInterval: 5 * 1000, // 5 seconds polling (matches OutboxPublisher interval)
    refetchIntervalInBackground: true, // Keep polling even when tab is not active
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchOnMount: 'always', // Always refetch on mount
    retry: 1,
    retryDelay: 5000,
    structuralSharing: false, // Disable structural sharing to force new object references
  });

  // Log when data changes
  React.useEffect(() => {
    if (queryInfo.data) {
      console.log('[useNotifications] Data updated in hook:', {
        dataCount: queryInfo.data.data.length,
        isFetching: queryInfo.isFetching,
        timestamp: new Date().toISOString()
      });
    }
  }, [queryInfo.data, queryInfo.isFetching]);

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