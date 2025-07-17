import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import type { Booking, CreateBookingRequest, UpdateBookingRequest } from '../../clients/bookings-client';

// Query keys for bookings
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (params?: any) => [...bookingKeys.lists(), { params }] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  availability: (date: Date, serviceId: string, staffId?: string) => 
    [...bookingKeys.all, 'availability', { date: date.toISOString(), serviceId, staffId }] as const,
};

// Query key for notifications (used to trigger refresh after booking changes)
export const notificationKeys = {
  all: ['notifications'] as const,
};

/**
 * Hook to fetch bookings with optional parameters
 */
export function useBookings(params?: any) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => apiClient.bookings.getBookings(params),
    staleTime: 2 * 60 * 1000, // 2 minutes (bookings change frequently)
    refetchOnWindowFocus: false, // Disable for now due to V2 API issues
    refetchInterval: false, // Disable auto-refetch to prevent error spam
    retry: 1, // Reduce retries
    retryDelay: 5000, // Wait 5 seconds before retry
  });
}

/**
 * Hook to fetch today's bookings specifically
 */
export function useTodayBookings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return useQuery({
    queryKey: bookingKeys.list({ 
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString() 
    }),
    queryFn: () => apiClient.bookings.getBookings({
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    }),
    staleTime: 1 * 60 * 1000, // 1 minute for today's bookings
    refetchOnWindowFocus: false, // Disable auto refetch for now
    refetchInterval: false, // Disable interval refetch to prevent constant errors
    retry: false, // Disable retries completely for now
    onError: (error) => {
      // Silently handle errors for now due to V2 API issues
    },
  });
}

/**
 * Hook to fetch a single booking by ID
 */
export function useBooking(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => apiClient.bookings.getBooking(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes for individual bookings
  });
}

/**
 * Hook to check availability for booking slots
 */
export function useAvailability(date: Date, serviceId: string, staffId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: bookingKeys.availability(date, serviceId, staffId),
    queryFn: () => apiClient.bookings.checkAvailability({ date, serviceId, staffId }),
    enabled: enabled && !!serviceId,
    staleTime: 1 * 60 * 1000, // 1 minute for availability
  });
}

/**
 * Mutation hook to create a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) => apiClient.bookings.createBooking(data),
    onSuccess: (newBooking) => {
      // Invalidate and refetch bookings lists
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      
      // Add the new booking to the cache
      queryClient.setQueryData(
        bookingKeys.detail(newBooking.id),
        newBooking
      );
      
      // Trigger notification refresh (notification will be created on backend)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }, 1000); // Small delay to allow backend to create notification
    },
    onError: (error) => {
    },
  });
}

/**
 * Mutation hook to update a booking
 */
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBookingRequest }) => 
      apiClient.bookings.updateBooking(id, data),
    onSuccess: (updatedBooking, { id }) => {
      // Update the specific booking in cache
      queryClient.setQueryData(
        bookingKeys.detail(id),
        updatedBooking
      );
      
      // Invalidate lists to ensure they're updated
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      
      // Trigger notification refresh if status changed (notification created on backend)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }, 1000);
    },
    onError: (error) => {
    },
  });
}

/**
 * Mutation hook to reschedule a booking
 */
export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { startTime: string; staffId?: string } }) => 
      apiClient.bookings.rescheduleBooking(id, data),
    onSuccess: (updatedBooking, { id }) => {
      // Update the specific booking in cache
      queryClient.setQueryData(
        bookingKeys.detail(id),
        updatedBooking
      );
      
      // Invalidate lists and availability queries
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...bookingKeys.all, 'availability'] });
      
      // Trigger notification refresh (booking_modified notification)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }, 1000);
    },
    onError: (error) => {
    },
  });
}

/**
 * Mutation hook to start a booking
 */
export function useStartBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.bookings.startBooking(id),
    onSuccess: (updatedBooking, id) => {
      // Update the specific booking in cache
      queryClient.setQueryData(
        bookingKeys.detail(id),
        updatedBooking
      );
      
      // Invalidate lists to update status
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
    onError: (error) => {
    },
  });
}

/**
 * Mutation hook to complete a booking
 */
export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.bookings.completeBooking(id),
    onSuccess: (updatedBooking, id) => {
      // Update the specific booking in cache
      queryClient.setQueryData(
        bookingKeys.detail(id),
        updatedBooking
      );
      
      // Invalidate lists to update status
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
    onError: (error) => {
    },
  });
}

/**
 * Mutation hook to cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiClient.bookings.cancelBooking(id, reason),
    onSuccess: (updatedBooking, { id }) => {
      // Update the specific booking in cache
      queryClient.setQueryData(
        bookingKeys.detail(id),
        updatedBooking
      );
      
      // Invalidate lists to update status
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      
      // Trigger notification refresh (booking_cancelled notification)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }, 1000);
    },
    onError: (error) => {
    },
  });
}