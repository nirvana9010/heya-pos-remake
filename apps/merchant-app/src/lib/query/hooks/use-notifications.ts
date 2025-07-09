import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import { notificationKeys } from './use-bookings';
import React from 'react';
import { featureFlags } from '../../feature-flags';

/**
 * Hook to fetch merchant notifications
 */
export function useNotifications(params?: {
  skip?: number;
  take?: number;
  unreadOnly?: boolean;
}) {
  // Use longer polling interval when Supabase Realtime is enabled
  const useSupabase = featureFlags.isEnabled('supabaseRealtime');
  const pollingInterval = useSupabase ? 5 * 60 * 1000 : 30 * 1000; // 5 min vs 30 sec

  const queryInfo = useQuery({
    queryKey: [...notificationKeys.all, params],
    queryFn: async () => {
      const result = await apiClient.notifications.getNotifications(params);
      return result;
    },
    staleTime: 0, // Always consider data stale to force fresh fetches
    gcTime: 0, // Don't garbage collect the data (renamed from cacheTime in v5)
    refetchInterval: pollingInterval, // Longer interval when using Supabase
    refetchIntervalInBackground: false, // Don't poll in background
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchOnMount: 'always', // Always refetch on mount
    retry: 1,
    retryDelay: 5000,
    structuralSharing: false, // Disable structural sharing to force new object references
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