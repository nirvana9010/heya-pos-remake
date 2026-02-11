import { BaseApiClient } from './base-client';

export interface ReportData {
  // Revenue metrics (flat structure)
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  revenueByMethod: {
    cash: number;
    card: number;
    deposits: number;
    unpaid: number;
    incomplete: number;
  };
  revenueGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  
  // Booking metrics (flat structure with time breakdowns)
  bookings: {
    // Time-based breakdowns
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    // Status breakdowns
    total: number;
    completed: number;
    dailyCompleted: number;
    weeklyCompleted: number;
    monthlyCompleted: number;
    cancelled: number;
    noShow: number;
    pending: number;
  };
  bookingGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  
  // Customer metrics (flat structure)
  customers: {
    total: number;
    new: number;
    returning: number;
    loyaltyMembers: number;
  };
  customerGrowth: number;
  
  // Performance data
  topServices: Array<{
    serviceId: string;
    name: string;
    bookings: number;
    revenue: number;
  }>;
  staffPerformance: Array<{
    staffId: string;
    name: string;
    bookings: number;
    revenue: number;
    utilization: number;
  }>;
  
  // Trend data
  revenueTrend: Array<{
    date: string;
    value: number;
  }>;
  bookingTrend: Array<{
    date: string;
    value: number;
  }>;
  
  // Calculated metrics
  avgBookingValue: number;
  avgServiceDuration: number;
  customerRetentionRate: number;
  
  // Additional data for fill rate calculation
  businessHours?: any; // JSON object with business hours
  activeStaffCount?: number; // Number of active staff
}

export interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  newCustomers: number;
  pendingBookings: number;
  bookingGrowth: number;
  revenueGrowth: number;
  customerGrowth: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  staffFirstName: string;
  staffLastName: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress: string | null;
  timestamp: string;
}

export interface ActivityLogResponse {
  data: ActivityLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ActivityLogParams {
  page?: number;
  limit?: number;
  staffId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export interface DailySummary {
  revenueByMethod: {
    cash: number;
    card: number;
    deposits: number;
    unpaid: number;
    incomplete: number;
  };
  bookings: {
    total: number;
    completed: number;
  };
  staffPerformance: Array<{
    staffId: string;
    name: string;
    bookings: number;
    revenue: number;
    utilization: number;
  }>;
}

export class ReportsClient extends BaseApiClient {
  async getDailySummary(date?: string, locationId?: string): Promise<DailySummary> {
    const params: any = {};
    if (date) params.date = date;
    if (locationId) params.locationId = locationId;
    return this.get('/reports/daily-summary', { params }, 'v1');
  }

  async getReportOverview(locationId?: string): Promise<ReportData> {
    const params = locationId ? { locationId } : undefined;
    return this.get('/reports/overview', { params }, 'v1');
  }

  async getRevenueStats(locationId?: string) {
    const params = locationId ? { locationId } : undefined;
    return this.get('/reports/revenue', { params }, 'v1');
  }

  async getBookingStats(locationId?: string) {
    const params = locationId ? { locationId } : undefined;
    return this.get('/reports/bookings', { params }, 'v1');
  }

  async getCustomerStats() {
    return this.get('/reports/customers', undefined, 'v1');
  }

  async getTopServices(limit = 10) {
    return this.get('/reports/top-services', { params: { limit } }, 'v1');
  }

  async getStaffPerformance(limit = 10) {
    return this.get('/reports/staff-performance', { params: { limit } }, 'v1');
  }

  async getRevenueTrend(days = 30) {
    return this.get('/reports/revenue-trend', { params: { days } }, 'v1');
  }

  async getActivityLog(params?: ActivityLogParams): Promise<ActivityLogResponse> {
    return this.get('/reports/activity-log', { params }, 'v1');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      return await this.get('/dashboard/stats', undefined, 'v1');
    } catch (error: any) {
      // If dashboard endpoint doesn't exist, calculate from reports overview
      if (error.status === 404) {
        console.log('Dashboard endpoint not found, calculating stats from reports overview');
        
        try {
          // Get the reports overview data which has all the info we need
          const overview = await this.getReportOverview();
          
          return {
            todayBookings: overview.bookings?.total || 0,
            todayRevenue: overview.revenue?.daily || 0,
            newCustomers: overview.customers?.new || 0,
            pendingBookings: overview.bookings?.pending || 0,
            bookingGrowth: overview.bookingGrowth?.daily || 0,
            revenueGrowth: overview.revenueGrowth?.daily || 0,
            customerGrowth: overview.customerGrowth || 0
          };
        } catch (fallbackError) {
          console.error('Failed to get stats from reports overview:', fallbackError);
          // Return default values as last resort
          return {
            todayBookings: 0,
            todayRevenue: 0,
            newCustomers: 0,
            pendingBookings: 0,
            bookingGrowth: 0,
            revenueGrowth: 0,
            customerGrowth: 0
          };
        }
      }
      throw error;
    }
  }
}
