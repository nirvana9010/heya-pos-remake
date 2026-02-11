import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import type { ReportData, DashboardStats, ActivityLogParams, DailySummary } from '../../clients/reports-client';

// Query keys for reports
export const reportKeys = {
  all: ['reports'] as const,
  dailySummary: (date?: string) => [...reportKeys.all, 'daily-summary', { date }] as const,
  overview: (locationId?: string) => [...reportKeys.all, 'overview', { locationId }] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  revenue: (locationId?: string) => [...reportKeys.all, 'revenue', { locationId }] as const,
  bookings: (locationId?: string) => [...reportKeys.all, 'bookings', { locationId }] as const,
  customers: () => [...reportKeys.all, 'customers'] as const,
  topServices: (limit?: number) => [...reportKeys.all, 'topServices', { limit }] as const,
  staffPerformance: (limit?: number) => [...reportKeys.all, 'staffPerformance', { limit }] as const,
  revenueTrend: (days?: number) => [...reportKeys.all, 'revenueTrend', { days }] as const,
  activityLog: (params?: ActivityLogParams) => [...reportKeys.all, 'activityLog', params] as const,
};

/**
 * Hook to fetch daily summary (revenue breakdown + booking counts) for a specific date
 */
export function useDailySummary(date?: string) {
  return useQuery<DailySummary>({
    queryKey: reportKeys.dailySummary(date),
    queryFn: () => apiClient.reports.getDailySummary(date),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => apiClient.reports.getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable auto-refetch to prevent too many requests
    refetchInterval: false, // Disable interval refetch
    retry: 1, // Reduce retries
  });
}

/**
 * Hook to fetch report overview data
 */
export function useReportOverview(locationId?: string) {
  return useQuery({
    queryKey: reportKeys.overview(locationId),
    queryFn: () => apiClient.reports.getReportOverview(locationId),
    staleTime: 5 * 60 * 1000, // 5 minutes for report overview
    refetchOnWindowFocus: false, // Don't auto-refetch reports on focus
  });
}

/**
 * Hook to fetch revenue statistics
 */
export function useRevenueStats(locationId?: string) {
  return useQuery({
    queryKey: reportKeys.revenue(locationId),
    queryFn: () => apiClient.reports.getRevenueStats(locationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch booking statistics
 */
export function useBookingStats(locationId?: string) {
  return useQuery({
    queryKey: reportKeys.bookings(locationId),
    queryFn: () => apiClient.reports.getBookingStats(locationId),
    staleTime: 3 * 60 * 1000, // 3 minutes for booking stats
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch customer statistics
 */
export function useCustomerStats() {
  return useQuery({
    queryKey: reportKeys.customers(),
    queryFn: () => apiClient.reports.getCustomerStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes for customer stats
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch top services data
 */
export function useTopServices(limit: number = 10) {
  return useQuery({
    queryKey: reportKeys.topServices(limit),
    queryFn: () => apiClient.reports.getTopServices(limit),
    staleTime: 15 * 60 * 1000, // 15 minutes for top services
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch staff performance data
 */
export function useStaffPerformance(limit: number = 10) {
  return useQuery({
    queryKey: reportKeys.staffPerformance(limit),
    queryFn: () => apiClient.reports.getStaffPerformance(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes for staff performance
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch revenue trend data
 */
export function useRevenueTrend(days: number = 30) {
  return useQuery({
    queryKey: reportKeys.revenueTrend(days),
    queryFn: () => apiClient.reports.getRevenueTrend(days),
    staleTime: 15 * 60 * 1000, // 15 minutes for trend data
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch activity log data with pagination and filters
 */
export function useActivityLog(params?: ActivityLogParams) {
  return useQuery({
    queryKey: reportKeys.activityLog(params),
    queryFn: () => apiClient.reports.getActivityLog(params),
    staleTime: 60 * 1000, // 1 minute for activity log
    refetchOnWindowFocus: false,
  });
}