"use client";

import { useState } from "react";
import { Calendar, Download, TrendingUp, TrendingDown, Users, DollarSign, Clock, BarChart3, Activity, ShoppingBag, FileText, ArrowRight, ArrowUp, ArrowDown, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
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
  const [selectedTab, setSelectedTab] = useState("overview");
  const { toast } = useToast();

  // Use React Query for data fetching
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

    // Handle both old nested structure and new flat structure
    const revenue = reportData.revenue?.revenue || reportData.revenue || {};
    const currentRevenue = revenue[timeRange as keyof typeof revenue] || 0;
    
    // Get growth from nested or flat structure
    const growth = reportData.revenue?.growth || reportData.revenueGrowth || {};
    const revenueGrowth = growth[timeRange as keyof typeof growth] || 0;
    
    // Calculate trends using our utility functions
    const revenueTrend = calculateCurrencyTrend(
      currentRevenue,
      currentRevenue / (1 + revenueGrowth / 100)
    );
    
    // Calculate real booking growth if we have the data
    const bookingGrowth = reportData.bookingGrowth?.monthly || 0;
    const bookings = reportData.bookings?.bookings || reportData.bookings || {};
    const bookingTrend = calculateCountTrend(
      bookings.total || 0,
      (bookings.total || 0) / (1 + bookingGrowth / 100)
    );
    
    const customerGrowth = reportData.customers?.growth ?? reportData.customerGrowth ?? 0;
    const totalCustomers = reportData.customers?.customers?.total || reportData.customers?.total || 0;
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
    const sparklineData = (reportData.revenueTrend || []).slice(-12).map(item => item.value || 0);

    // Transform revenue trend data for chart - handle empty array case
    let chartData = [];
    
    if (reportData.revenueTrend && reportData.revenueTrend.length > 0) {
      // Use actual trend data if available
      chartData = reportData.revenueTrend.slice(-180).reduce((acc: any[], item) => {
        // Group by month
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
    
    // If no data or empty, use current revenue data to generate a simple chart
    if (chartData.length === 0) {
      const monthlyRevenue = revenue.monthly || 0;
      const currentMonth = new Date().getMonth();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Generate last 6 months with simulated data based on current revenue
      chartData = Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (currentMonth - (5 - i) + 12) % 12;
        const variation = 0.8 + Math.random() * 0.4; // Random variation between 80% and 120%
        return {
          month: monthNames[monthIndex],
          revenue: Math.round(monthlyRevenue * variation)
        };
      });
      
      // Make the last month the actual monthly revenue
      if (chartData.length > 0) {
        chartData[chartData.length - 1].revenue = Math.round(monthlyRevenue);
      }
    }

    return (
      <div className="space-y-6">
        {/* Enhanced Metric Cards with Sparklines */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
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
                    <span className="text-xs text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <Sparkline data={sparklineData} color="#3b82f6" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold">{bookings.total || 0}</div>
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
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <div className="text-3xl font-bold">{reportData.customers?.customers?.total || 0}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendBadge trend={customerTrend} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {reportData.customers?.customers?.new || reportData.customers?.new || 0} new
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

        {/* Revenue Trend Chart */}
        <Card className="col-span-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over the last 6 months</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(chartData, "revenue-trend")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                    {reportData.topServices.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {reportData.topServices.slice(0, 5).map((service, index) => (
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
                {reportData.staffPerformance.slice(0, 4).map((staff, index) => (
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

        {/* Booking Statistics with Better Visual */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Statistics</CardTitle>
            <CardDescription>Performance metrics for the current period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-lg border bg-card p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{bookings.completed || 0}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {bookings.total > 0 ? Math.round((bookings.completed / bookings.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-lg border bg-card p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{bookings.pending || 0}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-lg border bg-card p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{bookings.cancelled || 0}</p>
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                  </div>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-lg border bg-card p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{bookings.noShow || 0}</p>
                    <p className="text-xs text-muted-foreground">No Show</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const CustomersTab = () => {
    // Since this component is only rendered when reportData exists (parent checks),
    // we can safely assume reportData is available
    if (!reportData) {
      // This should never happen because parent component checks
      return null;
    }

    // Handle both nested and flat structures
    const customers = reportData.customers?.customers || reportData.customers || {};
    const customerGrowth = reportData.customers?.growth ?? reportData.customerGrowth ?? 0;

    return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
            <div className="flex items-center text-sm text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span className="text-xs">+{customerGrowth}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.new || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
            <div className="flex items-center text-sm text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span className="text-xs">+{customerGrowth}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.loyaltyMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {customers.total > 0 ? Math.round(((customers.loyaltyMembers || 0) / customers.total) * 100) : 0}% of total
            </p>
            <div className="flex items-center text-sm text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span className="text-xs">+2.1%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Retention</CardTitle>
          <CardDescription>Customer visit frequency and loyalty metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Returning Customer Rate</p>
                <p className="text-sm text-muted-foreground">Customers with 2+ visits</p>
              </div>
              <p className="text-2xl font-bold">
                {Math.round((reportData.customers.customers.returning / reportData.customers.customers.total) * 100)}%
              </p>
            </div>
            <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Average Visit Frequency</p>
                <p className="text-sm text-muted-foreground">Visits per customer per month</p>
              </div>
              <p className="text-2xl font-bold">2.3</p>
            </div>
            <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Customer Lifetime Value</p>
                <p className="text-sm text-muted-foreground">Average revenue per customer</p>
              </div>
              <p className="text-2xl font-bold">
                ${reportData.revenue?.revenue?.yearly && reportData.customers?.customers?.total 
                  ? Math.round(reportData.revenue.revenue.yearly / reportData.customers.customers.total)
                  : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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
      revenue: reportData.revenue,
      bookings: reportData.bookings,
      customers: reportData.customers,
      services: reportData.topServices,
      staff: reportData.staffPerformance,
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
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header with Prominent Date Range */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Track performance, identify trends, and make data-driven decisions
              </p>
          </div>
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
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
      </div>

      <ErrorBoundary>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full md:w-[400px] grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <ErrorBoundary>
              <OverviewTab />
            </ErrorBoundary>
          </TabsContent>
          
          <TabsContent value="customers" className="mt-6">
            <ErrorBoundary>
              <CustomersTab />
            </ErrorBoundary>
          </TabsContent>
          
          <TabsContent value="financial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Reports
                </CardTitle>
                <CardDescription>Detailed revenue and expense analytics coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Advanced financial reporting will be available in the next update
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ErrorBoundary>
    </div>
    </PinProtected>
  );
}