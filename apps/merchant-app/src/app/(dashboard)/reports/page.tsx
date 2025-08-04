"use client";

import { useState } from "react";
import { Calendar, Download, TrendingUp, TrendingDown, Users, DollarSign, Clock, BarChart3, Activity, ShoppingBag, FileText, ArrowRight, ArrowUp, ArrowDown, AlertCircle, RefreshCw, LayoutDashboard, ChartBar } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { Skeleton } from "@heya-pos/ui";
import { useReportOverview } from "@/lib/query/hooks";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, subMonths } from "date-fns";
import { ErrorBoundary } from "@/components/error-boundary";
import { TrendBadge } from "@/components/TrendBadge";
import { calculateTrend, calculateCurrencyTrend, calculateCountTrend } from "@heya-pos/utils";
import { PinProtected } from "@/components/PinProtected";
import { ExecutiveDashboard } from "./executive-dashboard";

// Import the type from the client
import type { ReportData } from '@/lib/clients/reports-client';

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// Helper function to calculate percentage change
const calculateChange = (current: number, previous: number) => {
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change).toFixed(1),
    isPositive: change >= 0,
  };
};

// Helper function to export data
const exportToCSV = (data: any, filename: string) => {
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row: any) => Object.values(row).join(",")).join("\n");
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          Revenue: <span className="font-medium text-foreground">${payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Sparkline component
const Sparkline = ({ data, color = "#3b82f6" }: { data: number[]; color?: string }) => (
  <ResponsiveContainer width={100} height={30}>
    <LineChart data={data.map((value, index) => ({ value, index }))}>
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState("monthly");
  const [viewMode, setViewMode] = useState<"executive" | "classic">("executive");
  const { toast } = useToast();

  // Use React Query for data fetching - backend returns all time ranges at once
  const { 
    data: reportData, 
    isLoading: loading, 
    error,
    refetch: loadReportData,
    isRefetching
  } = useReportOverview();

  // Handle errors with toast notifications
  if (error && !isRefetching) {
    console.error('[Reports] Failed to load report data:', error);
    toast({
      title: "Error",
      description: "Failed to load report data. Please try again later.",
      variant: "destructive",
    });
  }

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track performance, identify trends, and make data-driven decisions
            </p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track performance, identify trends, and make data-driven decisions
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Reports</h3>
              <p className="text-muted-foreground mb-4">
                {error || 'An error occurred while loading the report data.'}
              </p>
              <Button onClick={loadReportData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const OverviewTab = () => {
    // Since this component is only rendered when reportData exists (parent checks),
    // we can safely assume reportData is available
    if (!reportData) {
      // This should never happen because parent component checks
      return null;
    }

    // Backend returns all time ranges, we select based on filter
    const revenue = reportData.revenue || {};
    const currentRevenue = revenue[timeRange as keyof typeof revenue] || 0;
    
    // Get growth for the selected period
    const growth = reportData.revenueGrowth || {};
    const revenueGrowth = growth[timeRange as keyof typeof growth] || 0;
    
    // Calculate trends using our utility functions
    const revenueTrend = calculateCurrencyTrend(
      currentRevenue,
      currentRevenue / (1 + revenueGrowth / 100)
    );
    
    // Get booking data - backend doesn't provide time range breakdown for bookings
    // So we always show total bookings regardless of time filter
    const bookingGrowth = reportData.bookingGrowth?.[timeRange as keyof typeof reportData.bookingGrowth] || 0;
    const bookings = reportData.bookings || {};
    const currentBookings = bookings.total || 0; // Always use total since no time breakdown exists
    const bookingTrend = calculateCountTrend(
      currentBookings,
      currentBookings / (1 + bookingGrowth / 100)
    );
    
    // Customer data - backend doesn't provide time range breakdown for customers
    // So we always show total customers regardless of time filter  
    const customerGrowth = reportData.customerGrowth || 0; // No time breakdown for growth
    const customers = reportData.customers || {};
    const totalCustomers = customers.total || 0; // Always use total since no time breakdown exists
    const customerTrend = calculateCountTrend(
      totalCustomers,
      totalCustomers / (1 + customerGrowth / 100)
    );
    
    // Calculate average booking value
    const monthlyBookings = bookings.completed || 1;
    const monthlyRevenue = revenue.monthly || 0;
    const avgBookingValue = reportData.avgBookingValue || (monthlyBookings > 0 ? monthlyRevenue / monthlyBookings : 0);
    const avgValueTrend = calculateCurrencyTrend(
      avgBookingValue,
      avgBookingValue * 0.968 // Assume 3.2% growth for now
    );

    // Generate sparkline data from revenue trend 
    const revenueTrendArray = Array.isArray(reportData.revenueTrend) ? reportData.revenueTrend : [];
    const sparklineData = revenueTrendArray.slice(-12).map(item => item.value || 0);

    // Transform revenue trend data for chart based on time range
    let chartData = [];
    
    if (revenueTrendArray.length > 0) {
      // Format data based on time range
      if (timeRange === 'daily') {
        // Show last 7 days
        chartData = revenueTrendArray.slice(-7).map(item => ({
          month: format(new Date(item.date), 'EEE'), // Mon, Tue, Wed...
          revenue: Math.round(item.value || 0)
        }));
      } else if (timeRange === 'weekly') {
        // Show last 8 weeks
        chartData = revenueTrendArray.slice(-56).reduce((acc: any[], item, index) => {
          const weekIndex = Math.floor(index / 7);
          if (!acc[weekIndex]) {
            acc[weekIndex] = { 
              month: `W${weekIndex + 1}`, 
              revenue: 0 
            };
          }
          acc[weekIndex].revenue += (item.value || 0);
          return acc;
        }, []).map(item => ({
          month: item.month,
          revenue: Math.round(item.revenue)
        })).slice(-8);
      } else if (timeRange === 'yearly') {
        // Show last 5 years
        chartData = revenueTrendArray.reduce((acc: any[], item) => {
          const year = format(new Date(item.date), 'yyyy');
          const existingYear = acc.find(y => y.month === year);
          
          if (existingYear) {
            existingYear.revenue += (item.value || 0);
          } else {
            acc.push({ month: year, revenue: (item.value || 0) });
          }
          
          return acc;
        }, []).map(item => ({
          month: item.month,
          revenue: Math.round(item.revenue)
        })).slice(-5);
      } else {
        // Monthly (default) - Show last 6 months
        chartData = revenueTrendArray.slice(-180).reduce((acc: any[], item) => {
          const month = format(new Date(item.date), 'MMM');
          const existingMonth = acc.find(m => m.month === month);
          
          if (existingMonth) {
            existingMonth.revenue += (item.value || 0);
            existingMonth.days += 1;
          } else {
            acc.push({ month, revenue: (item.value || 0), days: 1 });
          }
          
          return acc;
        }, []).map(item => ({
          month: item.month,
          revenue: Math.round(item.revenue)
        })).slice(-6);
      }
    }
    
    // Flag to indicate no trend data is available
    const hasNoTrendData = chartData.length === 0;

    return (
      <div className="space-y-6">
        {/* Revenue Card - Directly affected by filter */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {timeRange === 'daily' && 'Today\'s Revenue'}
              {timeRange === 'weekly' && 'This Week\'s Revenue'}
              {timeRange === 'monthly' && 'This Month\'s Revenue'}
              {timeRange === 'yearly' && 'This Year\'s Revenue'}
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <div className="text-3xl font-bold">
                  ${currentRevenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendBadge trend={revenueTrend} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    vs {timeRange === 'daily' ? 'yesterday' : `last ${timeRange.slice(0, -2)}`}
                  </span>
                </div>
              </div>
              <Sparkline data={sparklineData} color="#3b82f6" />
            </div>
          </CardContent>
        </Card>

        {/* Overall Metrics - Not affected by filter */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Overall Metrics</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bookings
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <div className="text-3xl font-bold">{currentBookings}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendBadge trend={bookingTrend} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        {bookings.completed || 0} completed
                      </span>
                    </div>
                  </div>
                  <Sparkline data={sparklineData.map((_, i) => 140 + Math.random() * 30)} color="#10b981" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customers
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <div className="text-3xl font-bold">{totalCustomers}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendBadge trend={customerTrend} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        {reportData.customers?.new || 0} new
                      </span>
                    </div>
                  </div>
                  <Sparkline data={sparklineData.map((_, i) => 500 + i * 2)} color="#8b5cf6" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Booking Value</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold">${Math.round(avgBookingValue)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendBadge trend={avgValueTrend} size="sm" />
                    <span className="text-xs text-muted-foreground">vs last period</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <Card className="col-span-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  {timeRange === 'daily' && 'Daily revenue over the last 7 days'}
                  {timeRange === 'weekly' && 'Weekly revenue over the last 8 weeks'}
                  {timeRange === 'monthly' && 'Monthly revenue over the last 6 months'}
                  {timeRange === 'yearly' && 'Yearly revenue over the last 5 years'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(chartData, "revenue-trend")}
                disabled={hasNoTrendData}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hasNoTrendData ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No trend data available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue trend will appear as transactions are recorded
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Service Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Service Breakdown</CardTitle>
              <CardDescription>Revenue distribution by service</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={(reportData.topServices || []).slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {(reportData.topServices || []).slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {(reportData.topServices || []).slice(0, 5).map((service, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{service.name}</span>
                    </div>
                    <span className="font-medium">${service.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Utilization and revenue by staff member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(reportData.staffPerformance || []).slice(0, 4).map((staff, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {staff.bookings} bookings
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ${Math.round(staff.revenue / staff.bookings)} avg
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${staff.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">revenue</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className="font-medium">{staff.utilization}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${staff.utilization}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    );
  };


  const handleExportAll = () => {
    if (!reportData) {
      toast({
        title: "Error",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }
    
    const exportData = {
      revenue: reportData.revenue || {},
      bookings: reportData.bookings || {},
      customers: reportData.customers || {},
      services: reportData.topServices || [],
      staff: reportData.staffPerformance || [],
    };
    exportToCSV(
      Object.entries(exportData).flatMap(([category, data]) =>
        Array.isArray(data) ? data : [{ category, ...data }]
      ),
      `heya-pos-report-${new Date().toISOString().split('T')[0]}`
    );
  };

  return (
    <PinProtected feature="reports" title="Reports Access Required" description="Enter your PIN to view business reports">
      {viewMode === "executive" ? (
        <>
          <ExecutiveDashboard />
          <div className="container max-w-7xl mx-auto px-6 pb-6">
            <Button 
              variant="outline" 
              onClick={() => setViewMode("classic")}
              className="w-full sm:w-auto"
            >
              <ChartBar className="mr-2 h-4 w-4" />
              Switch to Classic View
            </Button>
          </div>
        </>
      ) : (
        <div className="container max-w-7xl mx-auto p-6 space-y-6">
          {/* Enhanced Header with View Toggle */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                <p className="text-muted-foreground mt-1">
                  Track performance, identify trends, and make data-driven decisions
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setViewMode("executive")}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Executive View
                </Button>
                <Button variant="outline" onClick={handleExportAll}>
                  <Download className="mr-2 h-4 w-4" />
                  Export All
                </Button>
              </div>
            </div>
          </div>
        
          {/* Prominent Date Range Selector */}
          <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Reporting Period:</span>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <span>Today</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <span>This Week</span>
                      <span className="text-xs text-muted-foreground">Last 7 days</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <span>This Month</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', { month: 'long' })}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="yearly">
                    <div className="flex items-center gap-2">
                      <span>This Year</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date().getFullYear()}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Compare to:</span>
                <Badge variant="secondary">Previous {timeRange.slice(0, -2)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <ErrorBoundary>
          <div className="mt-6">
            <OverviewTab />
          </div>
        </ErrorBoundary>
      </div>
      )}
    </PinProtected>
  );
}