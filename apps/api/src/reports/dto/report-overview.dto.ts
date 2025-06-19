export interface RevenueMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface GrowthMetrics {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface BookingMetrics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
}

export interface CustomerMetrics {
  total: number;
  new: number;
  returning: number;
  loyaltyMembers: number;
}

export interface ServicePerformance {
  serviceId: string;
  name: string;
  bookings: number;
  revenue: number;
}

export interface StaffPerformance {
  staffId: string;
  name: string;
  bookings: number;
  revenue: number;
  utilization: number;
}

export interface TrendData {
  date: string;
  value: number;
}

// Clean, flat structure for report overview
export interface ReportOverview {
  // Revenue metrics
  revenue: RevenueMetrics;
  revenueGrowth: GrowthMetrics;
  
  // Booking metrics
  bookings: BookingMetrics;
  bookingGrowth: GrowthMetrics;
  
  // Customer metrics  
  customers: CustomerMetrics;
  customerGrowth: number;
  
  // Performance data
  topServices: ServicePerformance[];
  staffPerformance: StaffPerformance[];
  
  // Trend data
  revenueTrend: TrendData[];
  bookingTrend: TrendData[];
  
  // Calculated metrics
  avgBookingValue: number;
  avgServiceDuration: number;
  customerRetentionRate: number;
}