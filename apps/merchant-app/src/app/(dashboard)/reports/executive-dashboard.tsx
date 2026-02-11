"use client";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  Activity,
  BarChart3,
  Trophy,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Skeleton } from "@heya-pos/ui";
import { Alert, AlertDescription } from "@heya-pos/ui";
import { useReportOverview, useDailySummary } from "@/lib/query/hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, addDays, subDays, isToday } from "date-fns";
import { cn } from "@heya-pos/ui";

const METHOD_COLORS: Record<string, string> = {
  cash: "#3b82f6",       // blue
  card: "#10b981",       // green
  deposits: "#f59e0b",   // yellow
  unpaid: "#ef4444",     // red
  incomplete: "#94a3b8", // grey
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  deposits: "Deposits",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
};

const METHOD_ORDER = ["cash", "card", "deposits", "unpaid", "incomplete"] as const;

const EMPTY_REVENUE_BY_METHOD: Record<(typeof METHOD_ORDER)[number], number> = {
  cash: 0,
  card: 0,
  deposits: 0,
  unpaid: 0,
  incomplete: 0,
};

function toAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const maybeDecimal = value as { toNumber?: () => number };
    if (typeof maybeDecimal.toNumber === "function") {
      const parsed = maybeDecimal.toNumber();
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Pure-CSS donut chart using conic-gradient */
function DonutChart({
  segments,
  total,
  size = 200,
  thickness = 40,
}: {
  segments: { key: string; value: number; color: string }[];
  total: number;
  size?: number;
  thickness?: number;
}) {
  // Build conic-gradient stops
  const gradientStops = useMemo(() => {
    if (total === 0) return "transparent";
    let cumulative = 0;
    const stops: string[] = [];
    for (const seg of segments) {
      const startPct = (cumulative / total) * 100;
      cumulative += seg.value;
      const endPct = (cumulative / total) * 100;
      stops.push(`${seg.color} ${startPct}% ${endPct}%`);
    }
    return stops.join(", ");
  }, [segments, total]);

  const inner = size - thickness * 2;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientStops})`,
        }}
      />
      {/* Inner white circle to create donut hole */}
      <div
        className="absolute bg-background rounded-full"
        style={{
          width: inner,
          height: inner,
          top: thickness,
          left: thickness,
        }}
      />
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold">${total.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = isToday(selectedDate);

  const {
    data: reportData,
    isLoading: overviewLoading,
    error: overviewError,
  } = useReportOverview();

  const {
    data: dailySummary,
    isLoading: dailyLoading,
    error: dailyError,
  } = useDailySummary(dateStr);

  if (overviewLoading) {
    return <DashboardSkeleton />;
  }

  if (overviewError || !reportData) {
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

  // Process week rhythm data (last 7 days)
  const revenueTrend = Array.isArray(reportData.revenueTrend) ? reportData.revenueTrend : [];
  const weekData = revenueTrend.length > 0
    ? revenueTrend.slice(-7).map((item, index) => {
        const date = new Date(item.date);
        const dayName = format(date, "EEE");
        const isLast = index === revenueTrend.slice(-7).length - 1;
        return {
          day: dayName,
          revenue: item.value || 0,
          isToday: isLast,
          date: format(date, "MMM d"),
        };
      })
    : [];

  const bestDay = weekData.reduce((max, day) =>
    day.revenue > max.revenue ? day : max, weekData[0] || { revenue: 0 });
  const worstDay = weekData.reduce((min, day) =>
    day.revenue < min.revenue ? day : min, weekData[0] || { revenue: 0 });

  // Staff leaderboard
  const staffPerformance = reportData.staffPerformance || [];

  // Daily summary data
  const rawRevenueByMethod = dailySummary?.revenueByMethod
    ?? (isSelectedToday ? reportData.revenueByMethod : undefined)
    ?? EMPTY_REVENUE_BY_METHOD;

  const revenueByMethod = METHOD_ORDER.reduce(
    (acc, key) => {
      acc[key] = toAmount((rawRevenueByMethod as Record<string, unknown>)[key]);
      return acc;
    },
    { ...EMPTY_REVENUE_BY_METHOD },
  );

  const methodTotal = METHOD_ORDER.reduce((s, k) => s + revenueByMethod[k], 0);
  const donutSegments = METHOD_ORDER
    .filter((k) => revenueByMethod[k] > 0)
    .map((k) => ({ key: k, value: revenueByMethod[k], color: METHOD_COLORS[k] }));

  const dayBookings = dailySummary?.bookings?.total ?? reportData.bookings?.daily ?? 0;
  const dayCompleted = dailySummary?.bookings?.completed ?? reportData.bookings?.dailyCompleted ?? 0;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your business at a glance &bull; {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[180px]">
          <div className="text-lg font-semibold">
            {isSelectedToday ? "Today" : format(selectedDate, "EEEE")}
          </div>
          <div className="text-sm text-muted-foreground">{format(selectedDate, "MMMM d, yyyy")}</div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isSelectedToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
        )}
      </div>

      {/* Daily Revenue Breakdown + Staff Leaderboard */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Revenue Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue Breakdown</CardTitle>
            <CardDescription>
              {isSelectedToday ? "Today's" : format(selectedDate, "MMM d")} revenue by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <div className="flex justify-center py-8">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
              </div>
            ) : dailyError && !dailySummary ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Unable to load this day</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please try changing date or refreshing
                </p>
              </div>
            ) : methodTotal > 0 ? (
              <>
                <DonutChart segments={donutSegments} total={methodTotal} />
                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {METHOD_ORDER.map((key) => {
                    const value = revenueByMethod[key] || 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: METHOD_COLORS[key] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{METHOD_LABELS[key]}</div>
                          <div className="text-xs text-muted-foreground">
                            ${value.toLocaleString()}
                            {methodTotal > 0 && ` (${((value / methodTotal) * 100).toFixed(0)}%)`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No bookings this day</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data will appear as bookings are scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Staff Leaderboard
            </CardTitle>
            <CardDescription>This month's top performers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {staffPerformance.length > 0 ? (
              <div className="space-y-3">
                {staffPerformance.map((staff, index) => {
                  const maxRevenue = staffPerformance[0]?.revenue || 1;
                  const barWidth = (staff.revenue / maxRevenue) * 100;
                  return (
                    <div key={staff.staffId} className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        index === 0 && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        index === 1 && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                        index === 2 && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                        index > 2 && "bg-muted text-muted-foreground",
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{staff.name}</span>
                          <span className="text-sm font-semibold ml-2">${staff.revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all duration-300",
                              index === 0 ? "bg-yellow-500" : "bg-primary",
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {staff.bookings} bookings
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No staff data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Staff rankings will appear as bookings are completed
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Week Rhythm */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Rhythm</CardTitle>
          <CardDescription>Revenue pattern for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {weekData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tick={{ fill: "#6b7280" }} />
                  <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: "#6b7280" }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="text-sm font-medium">{data.date}</p>
                            <p className="text-sm text-muted-foreground">
                              Revenue: <span className="font-medium text-foreground">${data.revenue.toLocaleString()}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {weekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isToday ? "#3b82f6" : "#cbd5e1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Best Day</span>
                  <span className="text-sm font-medium">{bestDay.day} (${bestDay.revenue.toLocaleString()})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Weakest Day</span>
                  <span className="text-sm font-medium">{worstDay.day} (${worstDay.revenue.toLocaleString()})</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No revenue data available</p>
              <p className="text-xs text-muted-foreground mt-1">Revenue data will appear as transactions are recorded</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card className="overflow-hidden border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {isSelectedToday ? "Today's" : format(selectedDate, "MMM d")} Bookings
            {isSelectedToday && (
              <Badge variant="outline" className="font-normal">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{dayBookings}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {dayCompleted > 0 && `${dayCompleted} completed`}
            {dayCompleted === 0 && dayBookings > 0 && `${dayBookings} scheduled`}
            {dayBookings === 0 && "No bookings"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-60 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-[200px] rounded-full mx-auto" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
