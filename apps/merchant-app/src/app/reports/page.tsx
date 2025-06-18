"use client";

import { useState } from "react";
import { Calendar, Download, TrendingUp, TrendingDown, Users, DollarSign, Clock, BarChart3, Activity, ShoppingBag, FileText, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
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

interface ReportData {
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    previousPeriod: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    previousPeriod: {
      total: number;
      completed: number;
    };
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    loyaltyMembers: number;
    previousPeriod: {
      total: number;
      new: number;
    };
  };
  services: {
    name: string;
    bookings: number;
    revenue: number;
  }[];
  staff: {
    name: string;
    bookings: number;
    revenue: number;
    utilization: number;
    avgServiceValue: number;
  }[];
  revenueChart: {
    month: string;
    revenue: number;
  }[];
  sparklineData: {
    revenue: number[];
    bookings: number[];
    customers: number[];
  };
}

const mockReportData: ReportData = {
  revenue: {
    daily: 1250,
    weekly: 8500,
    monthly: 32000,
    yearly: 385000,
    previousPeriod: {
      daily: 1100,
      weekly: 7800,
      monthly: 29500,
      yearly: 365000,
    },
  },
  bookings: {
    total: 156,
    completed: 142,
    cancelled: 8,
    noShow: 6,
    previousPeriod: {
      total: 148,
      completed: 135,
    },
  },
  customers: {
    total: 524,
    new: 42,
    returning: 482,
    loyaltyMembers: 186,
    previousPeriod: {
      total: 495,
      new: 38,
    },
  },
  services: [
    { name: "Haircut & Style", bookings: 45, revenue: 2925 },
    { name: "Hair Color", bookings: 28, revenue: 4200 },
    { name: "Facial Treatment", bookings: 32, revenue: 2880 },
    { name: "Manicure", bookings: 38, revenue: 1710 },
    { name: "Massage", bookings: 13, revenue: 1560 },
  ],
  staff: [
    { name: "Emma Wilson", bookings: 42, revenue: 3150, utilization: 85, avgServiceValue: 75 },
    { name: "James Brown", bookings: 38, revenue: 2850, utilization: 78, avgServiceValue: 75 },
    { name: "Sophie Chen", bookings: 35, revenue: 2625, utilization: 72, avgServiceValue: 75 },
    { name: "Michael Davis", bookings: 28, revenue: 2100, utilization: 58, avgServiceValue: 75 },
  ],
  revenueChart: [
    { month: "Jan", revenue: 28500 },
    { month: "Feb", revenue: 31200 },
    { month: "Mar", revenue: 29800 },
    { month: "Apr", revenue: 32500 },
    { month: "May", revenue: 30900 },
    { month: "Jun", revenue: 32000 },
  ],
  sparklineData: {
    revenue: [28, 32, 35, 38, 42, 45, 48, 45, 50, 52, 48, 55],
    bookings: [120, 132, 145, 138, 152, 145, 148, 155, 142, 156, 148, 165],
    customers: [480, 485, 490, 495, 502, 508, 512, 515, 518, 521, 523, 524],
  },
};

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

  const OverviewTab = () => {
    const currentRevenue = mockReportData.revenue[timeRange as keyof typeof mockReportData.revenue.previousPeriod];
    const previousRevenue = mockReportData.revenue.previousPeriod[timeRange as keyof typeof mockReportData.revenue.previousPeriod];
    const revenueChange = calculateChange(currentRevenue, previousRevenue);
    
    const bookingChange = calculateChange(mockReportData.bookings.total, mockReportData.bookings.previousPeriod.total);
    const customerChange = calculateChange(mockReportData.customers.total, mockReportData.customers.previousPeriod.total);
    const avgBookingValue = Math.round(mockReportData.revenue.monthly / mockReportData.bookings.total);
    const previousAvgValue = Math.round(mockReportData.revenue.previousPeriod.monthly / mockReportData.bookings.previousPeriod.total);
    const avgValueChange = calculateChange(avgBookingValue, previousAvgValue);

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
                    <Badge
                      variant={revenueChange.isPositive ? "default" : "destructive"}
                      className="gap-1 px-2 py-0.5 text-xs"
                    >
                      {revenueChange.isPositive ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {revenueChange.value}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <Sparkline data={mockReportData.sparklineData.revenue} color="#3b82f6" />
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
                  <div className="text-3xl font-bold">{mockReportData.bookings.total}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={bookingChange.isPositive ? "default" : "destructive"}
                      className="gap-1 px-2 py-0.5 text-xs"
                    >
                      {bookingChange.isPositive ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {bookingChange.value}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {mockReportData.bookings.completed} completed
                    </span>
                  </div>
                </div>
                <Sparkline data={mockReportData.sparklineData.bookings} color="#10b981" />
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
                  <div className="text-3xl font-bold">{mockReportData.customers.total}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={customerChange.isPositive ? "default" : "destructive"}
                      className="gap-1 px-2 py-0.5 text-xs"
                    >
                      {customerChange.isPositive ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {customerChange.value}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {mockReportData.customers.new} new
                    </span>
                  </div>
                </div>
                <Sparkline data={mockReportData.sparklineData.customers} color="#8b5cf6" />
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
                  <div className="text-3xl font-bold">${avgBookingValue}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={avgValueChange.isPositive ? "default" : "destructive"}
                      className="gap-1 px-2 py-0.5 text-xs"
                    >
                      {avgValueChange.isPositive ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {avgValueChange.value}%
                    </Badge>
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
                onClick={() => exportToCSV(mockReportData.revenueChart, "revenue-trend")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockReportData.revenueChart}>
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
                    data={mockReportData.services}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {mockReportData.services.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {mockReportData.services.map((service, index) => (
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
                {mockReportData.staff.map((staff, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {staff.bookings} bookings
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ${staff.avgServiceValue} avg
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
                    <p className="text-2xl font-bold">{mockReportData.bookings.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round((mockReportData.bookings.completed / mockReportData.bookings.total) * 100)}%
                  </Badge>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-lg border bg-card p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{mockReportData.bookings.total - mockReportData.bookings.completed - mockReportData.bookings.cancelled - mockReportData.bookings.noShow}</p>
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
                    <p className="text-2xl font-bold">{mockReportData.bookings.cancelled}</p>
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
                    <p className="text-2xl font-bold">{mockReportData.bookings.noShow}</p>
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

  const CustomersTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockReportData.customers.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
            <div className="flex items-center text-sm text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span className="text-xs">+5.2%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockReportData.customers.new}</div>
            <p className="text-xs text-muted-foreground">This month</p>
            <div className="flex items-center text-sm text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span className="text-xs">+10.5%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockReportData.customers.loyaltyMembers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((mockReportData.customers.loyaltyMembers / mockReportData.customers.total) * 100)}% of total
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
                {Math.round((mockReportData.customers.returning / mockReportData.customers.total) * 100)}%
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
              <p className="text-2xl font-bold">$485</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const handleExportAll = () => {
    const exportData = {
      revenue: mockReportData.revenue,
      bookings: mockReportData.bookings,
      customers: mockReportData.customers,
      services: mockReportData.services,
      staff: mockReportData.staff,
    };
    exportToCSV(
      Object.entries(exportData).flatMap(([category, data]) =>
        Array.isArray(data) ? data : [{ category, ...data }]
      ),
      `heya-pos-report-${new Date().toISOString().split('T')[0]}`
    );
  };

  return (
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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        
        <TabsContent value="customers" className="mt-6">
          <CustomersTab />
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
    </div>
  );
}