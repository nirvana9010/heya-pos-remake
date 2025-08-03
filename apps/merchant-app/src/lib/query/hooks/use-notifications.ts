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
  // PERFORMANCE FIX: Increased interval from 10s to 60s to reduce server load
  // This still provides timely updates while dramatically reducing API calls
  const pollingInterval = 60 * 1000; // 60 seconds (was 10 seconds)
  
  // Track if tab is visible
  const [isTabVisible, setIsTabVisible] = React.useState(!document.hidden);
  
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
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
      
      const result = await apiClient.notifications.getNotifications(fetchParams);
      
      return result;
    },
    staleTime: 0, // Always consider data stale to force fresh fetches
    gcTime: 0, // Don't garbage collect the data
    refetchInterval: isTabVisible ? pollingInterval : false, // CRITICAL FIX: Only poll when tab is visible
    refetchIntervalInBackground: false, // CRITICAL FIX: Disabled background polling to reduce server load
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