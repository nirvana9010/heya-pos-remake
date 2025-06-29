import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import { notificationKeys } from './use-bookings';

/**
 * Hook to fetch merchant notifications
 */
export function useNotifications(params?: {
  skip?: number;
  take?: number;
  unreadOnly?: boolean;
}) {
  return useQuery({
    queryKey: [...notificationKeys.all, params],
    queryFn: () => apiClient.notifications.getNotifications(params),
    staleTime: 10 * 1000, // 10 seconds - notifications should be fresh
    refetchInterval: 30 * 1000, // 30 seconds polling
    refetchIntervalInBackground: true, // Keep polling even when tab is not active
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    retry: 1,
    retryDelay: 5000,
  });
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