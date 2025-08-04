import { BaseApiClient } from './base-client';

export interface ReportData {
  // Revenue metrics (flat structure)
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  revenueGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  
  // Booking metrics (flat structure)
  bookings: {
    total: number;
    completed: number;
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

export class ReportsClient extends BaseApiClient {
  async getReportOverview(locationId?: string, timeRange?: string): Promise<ReportData> {
    const params: any = {};
    if (locationId) params.locationId = locationId;
    if (timeRange) params.timeRange = timeRange;
    
    return this.get('/reports/overview', { params: Object.keys(params).length > 0 ? params : undefined }, 'v1');
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