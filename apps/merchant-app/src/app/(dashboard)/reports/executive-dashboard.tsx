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
  LabelList,
} from "recharts";
import { format, addDays, subDays, isToday } from "date-fns";
import { cn } from "@heya-pos/ui";

const METHOD_COLORS: Record<string, string> = {
  cash: "#10b981",       // green
  card: "#3b82f6",       // blue
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

function WeekTick({ x, y, payload }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} textAnchor="middle" fill="#6b7280" fontSize={12}>
        <tspan x={0} dy="0.71em">{payload?.payload?.day ?? payload?.value}</tspan>
        <tspan x={0} dy="1.2em" fill="#9ca3af" fontSize={11}>
          {payload?.payload?.date ?? ""}
        </tspan>
      </text>
    </g>
  );
}

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

  // Staff leaderboard (date-aware; fallback to overview only for today)
  const staffPerformance = dailySummary?.staffPerformance
    ?? (isSelectedToday ? (reportData.staffPerformance || []) : []);

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
  const dayTopServices = dailySummary?.topServices ?? [];
  const dayServiceLineItems = dailySummary?.serviceLineItems
    ?? dayTopServices.reduce(
      (sum, service) => sum + (service.serviceLineItems ?? service.bookings ?? 0),
      0,
    );
  const displayedTopServices = dayTopServices.slice(0, 10);
  const leftTopServices = displayedTopServices.slice(0, 5);
  const rightTopServices = displayedTopServices.slice(5, 10);
  const showTopServiceNumber = displayedTopServices.length === 10;

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
                  {donutSegments.map(({ key, value }) => {
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
            <CardDescription>
              {isSelectedToday ? "Today's" : format(selectedDate, "MMM d")} top performers by revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staffPerformance.length > 0 ? (
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3">
                {staffPerformance.map((staff, index) => {
                  const maxRevenue = staffPerformance[0]?.revenue || 1;
                  const barWidth = (staff.revenue / maxRevenue) * 100;
                  return (
                    <div key={staff.staffId} className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        index === 0 && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        index === 1 && "bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
                        index === 2 && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
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
                              index === 0 && "bg-yellow-500",
                              index === 1 && "bg-slate-400",
                              index === 2 && "bg-amber-600",
                              index > 2 && "bg-primary",
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

      {/* Bookings + Top Services */}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/40 p-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">BOOKINGS</div>
              <div className="text-3xl font-bold">{dayBookings}</div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">SERVICES</div>
              <div className="text-3xl font-bold">{dayServiceLineItems}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            {dailyLoading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                {[1, 2].map((col) => (
                  <div key={col} className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={`${col}-${i}`} className="h-4 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            ) : displayedTopServices.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 mt-2">
                <div className="space-y-2">
                  {leftTopServices.map((service, index) => (
                    <div key={service.serviceId} className="flex items-center justify-between gap-3">
                      <span className="text-sm truncate">
                        {showTopServiceNumber ? `${index + 1}. ` : ""}{service.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {service.serviceLineItems ?? service.bookings ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {rightTopServices.map((service, index) => (
                    <div key={service.serviceId} className="flex items-center justify-between gap-3">
                      <span className="text-sm truncate">
                        {showTopServiceNumber ? `${index + 6}. ` : ""}{service.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {service.serviceLineItems ?? service.bookings ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-2">
                No services booked
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Week Rhythm */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Rhythm</CardTitle>
          <CardDescription>Scheduled revenue pattern for the last 7 days (including incomplete)</CardDescription>
        </CardHeader>
        <CardContent>
          {weekData.length > 0 ? (
            <>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm bg-[#3b82f6]" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm bg-[#cbd5e1]" />
                  <span>Other days</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={weekData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    tick={<WeekTick />}
                    interval={0}
                    height={46}
                  />
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
                    <LabelList
                      dataKey="revenue"
                      position="top"
                      formatter={(value: number) => `$${Number(value || 0).toLocaleString()}`}
                      fill="#6b7280"
                      fontSize={11}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
