"use client";

import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Activity,
  Users,
  DollarSign,
  Calendar,
  Target,
  Info,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Skeleton } from "@heya-pos/ui";
import { Alert, AlertDescription } from "@heya-pos/ui";
import { useReportOverview } from "@/lib/query/hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@heya-pos/ui";

export function ExecutiveDashboard() {
  const { 
    data: reportData, 
    isLoading, 
    error,
    refetch
  } = useReportOverview();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !reportData) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Extract today's data
  const todayRevenue = reportData.revenue?.daily || 0;
  
  // Safely get yesterday's revenue from trend data
  const revenueTrend = Array.isArray(reportData.revenueTrend) ? reportData.revenueTrend : [];
  const yesterdayRevenue = revenueTrend.length >= 2 
    ? revenueTrend[revenueTrend.length - 2]?.value || 0
    : 0;
  
  const revenueChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
    : 0;
  const isRevenueUp = Number(revenueChange) > 0;

  // Process week rhythm data (last 7 days)
  const weekData = revenueTrend.length > 0 
    ? revenueTrend.slice(-7).map((item, index) => {
        const date = new Date(item.date);
        const dayName = format(date, 'EEE');
        const isToday = index === 6; // Last item is today
        return {
          day: dayName,
          revenue: item.value || 0,
          isToday,
          date: format(date, 'MMM d')
        };
      })
    : [];

  // Find best and worst days
  const bestDay = weekData.reduce((max, day) => 
    day.revenue > max.revenue ? day : max, weekData[0] || { revenue: 0 });
  const worstDay = weekData.reduce((min, day) => 
    day.revenue < min.revenue ? day : min, weekData[0] || { revenue: 0 });

  // Calculate week total and average
  const weekTotal = weekData.reduce((sum, day) => sum + day.revenue, 0);
  const weekAverage = weekData.length > 0 ? weekTotal / weekData.length : 0;

  // Generate insights
  const insights = generateInsights(reportData, weekData, bestDay, worstDay);

  // Calculate key metrics
  const totalCustomers = reportData.customers?.total || 0;
  const newCustomers = reportData.customers?.new || 0;
  const todayBookings = reportData.bookings?.daily || 0;
  const todayCompletedBookings = reportData.bookings?.dailyCompleted || 0;
  const weeklyCompletedBookings = reportData.bookings?.weeklyCompleted || 0;
  const avgTransactionValue = weekTotal > 0 && weeklyCompletedBookings > 0 
    ? Math.round(weekTotal / weeklyCompletedBookings) 
    : 0;

  // Get top service
  const topService = reportData.topServices?.[0] || null;
  const topStaff = reportData.staffPerformance?.[0] || null;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your business at a glance • {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Today's Snapshot */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Today's Snapshot
          <Badge variant="outline" className="font-normal">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={cn(
            "overflow-hidden border-l-4",
            isRevenueUp ? "border-l-green-500 bg-green-50/50" : "border-l-red-500 bg-red-50/50"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${todayRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-2">
                {isRevenueUp ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  isRevenueUp ? "text-green-600" : "text-red-600"
                )}>
                  {isRevenueUp ? '+' : ''}{revenueChange}% vs yesterday
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {todayBookings}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {todayCompletedBookings > 0 && `${todayCompletedBookings} completed`}
                {todayCompletedBookings === 0 && todayBookings > 0 && `${todayBookings} scheduled`}
                {todayBookings === 0 && "No bookings yet"}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Business Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                {getHealthScore(todayRevenue, weekAverage)}
                <span className="text-lg text-muted-foreground">/ 100</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {getHealthLabel(todayRevenue, weekAverage)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Week Rhythm */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Rhythm</CardTitle>
          <CardDescription>
            Revenue pattern for the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weekData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="text-sm font-medium">{data.date}</p>
                            <p className="text-sm text-muted-foreground">
                              Revenue: <span className="font-medium text-foreground">
                                ${data.revenue.toLocaleString()}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {weekData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isToday ? '#3b82f6' : '#cbd5e1'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Best Day</span>
              <span className="text-sm font-medium">
                {bestDay.day} (${bestDay.revenue.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Weakest Day</span>
              <span className="text-sm font-medium">
                {worstDay.day} (${worstDay.revenue.toLocaleString()})
              </span>
            </div>
          </div>
            </>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No revenue data available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue data will appear as transactions are recorded
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Insights */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Insights & Opportunities</h2>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <Alert key={index} className={cn(
              "border-l-4",
              insight.type === 'warning' && "border-l-yellow-500 bg-yellow-50/50",
              insight.type === 'success' && "border-l-green-500 bg-green-50/50",
              insight.type === 'info' && "border-l-blue-500 bg-blue-50/50"
            )}>
              <insight.icon className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <div className="font-medium">{insight.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{insight.action}</div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <div className="text-sm text-muted-foreground">
                {newCustomers > 0 && `+${newCustomers} new this month`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${avgTransactionValue}
              </div>
              <div className="text-sm text-muted-foreground">
                Per completed booking
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topService ? topService.name : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                {topService && `$${topService.revenue.toLocaleString()} revenue`}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getHealthScore(todayRevenue: number, weekAverage: number): number {
  if (weekAverage === 0) return 50;
  const ratio = todayRevenue / weekAverage;
  if (ratio >= 1.2) return 90;
  if (ratio >= 1) return 75;
  if (ratio >= 0.8) return 60;
  if (ratio >= 0.6) return 40;
  return 25;
}

function getHealthLabel(todayRevenue: number, weekAverage: number): string {
  const score = getHealthScore(todayRevenue, weekAverage);
  if (score >= 75) return "Performing well";
  if (score >= 50) return "On track";
  return "Needs attention";
}

function generateInsights(reportData: any, weekData: any[], bestDay: any, worstDay: any) {
  const insights = [];
  
  // Insight 1: Weak day pattern
  if (worstDay && worstDay.revenue < weekData[0]?.revenue * 0.5) {
    insights.push({
      type: 'warning',
      icon: AlertCircle,
      title: `${worstDay.day}s are consistently quiet (${worstDay.revenue === 0 ? 'no revenue' : `$${worstDay.revenue}`})`,
      action: 'Consider running promotions or special offers for this day'
    });
  }
  
  // Insight 2: Top service performance
  const topService = reportData.topServices?.[0];
  if (topService) {
    insights.push({
      type: 'success',
      icon: TrendingUp,
      title: `"${topService.name}" is your best performer`,
      action: `Generating $${topService.revenue.toLocaleString()} in revenue. Consider promoting similar services.`
    });
  }
  
  // Insight 3: Customer growth
  if (reportData.customers?.new > 0) {
    insights.push({
      type: 'info',
      icon: Users,
      title: `${reportData.customers.new} new customers this month`,
      action: 'Focus on converting them to regular clients with follow-up offers'
    });
  }
  
  // Default insight if no others
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: Info,
      title: 'Data is building',
      action: 'As more transactions are recorded, insights will become more actionable'
    });
  }
  
  return insights;
}

function DashboardSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-40 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}