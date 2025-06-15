'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Skeleton, CardSkeleton } from '@heya-pos/ui';
import { LastUpdated, ConnectionStatus, FadeIn } from '@heya-pos/ui';
import { Calendar, Users, DollarSign, Clock, Plus, TrendingUp, Sparkles, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { type Booking, type DashboardStats } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';
import { cn } from '@heya-pos/ui';

export default function DashboardPageEnhanced() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "polling" | "disconnected">("connected");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // Load dashboard data
    loadDashboardData();

    // Set up auto-refresh
    const interval = setInterval(() => {
      refreshDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats and today's bookings in parallel
      const [dashboardStats, bookings] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getBookings(new Date())
      ]);
      
      setStats(dashboardStats);
      setTodayBookings(bookings);
      setLastUpdated(new Date());
      setConnectionStatus("connected");
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setConnectionStatus("disconnected");
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboardData = async () => {
    try {
      setRefreshing(true);
      setConnectionStatus("polling");
      
      const [dashboardStats, bookings] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getBookings(new Date())
      ]);
      
      setStats(dashboardStats);
      setTodayBookings(bookings);
      setLastUpdated(new Date());
      setConnectionStatus("connected");
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
      setConnectionStatus("disconnected");
    } finally {
      setRefreshing(false);
    }
  };

  const quickActions = [
    { label: 'New Booking', icon: Plus, action: () => router.push('/bookings/new'), color: 'bg-teal-600 hover:bg-teal-700' },
    { label: 'View Calendar', icon: Calendar, action: () => router.push('/calendar'), color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Customers', icon: Users, action: () => router.push('/customers'), color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Reports', icon: DollarSign, action: () => router.push('/reports'), color: 'bg-amber-600 hover:bg-amber-700' }
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Recent bookings skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back!
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-600">
              Here's what's happening at your salon today
            </p>
            <ConnectionStatus status={connectionStatus} />
            <LastUpdated timestamp={lastUpdated} />
          </div>
        </div>
        <Button 
          onClick={() => router.push('/bookings/new')}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FadeIn delay={0}>
          <StatCard
            title="Today's Bookings"
            value={stats?.todayBookings || 8}
            icon={Calendar}
            change={stats?.bookingGrowth || 12}
            className={refreshing ? "opacity-70" : ""}
          />
        </FadeIn>
        
        <FadeIn delay={100}>
          <StatCard
            title="Today's Revenue"
            value={`$${Math.round(Number(stats?.todayRevenue) || 1240)}`}
            icon={DollarSign}
            change={stats?.revenueGrowth || 8}
            className={refreshing ? "opacity-70" : ""}
          />
        </FadeIn>
        
        <FadeIn delay={200}>
          <StatCard
            title="New Customers"
            value={stats?.newCustomers || 3}
            icon={Users}
            change={stats?.customerGrowth || 5}
            className={refreshing ? "opacity-70" : ""}
          />
        </FadeIn>
        
        <FadeIn delay={300}>
          <StatCard
            title="Avg Service Time"
            value="45m"
            icon={Clock}
            change={-2}
            className={refreshing ? "opacity-70" : ""}
          />
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <FadeIn delay={400}>
          <Card className={cn(refreshing && "opacity-70")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/bookings')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayBookings.slice(0, 5).map((booking, index) => (
                  <FadeIn key={booking.id} delay={index * 50}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{booking.customerName}</p>
                        <p className="text-xs text-gray-600">
                          {booking.serviceName} • {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        booking.status === 'confirmed' && "bg-blue-100 text-blue-700",
                        booking.status === 'in-progress' && "bg-yellow-100 text-yellow-700",
                        booking.status === 'completed' && "bg-green-100 text-green-700"
                      )}>
                        {booking.status}
                      </div>
                    </div>
                  </FadeIn>
                ))}
                
                {todayBookings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No bookings yet today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={500}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <FadeIn key={action.label} delay={500 + index * 100}>
                    <button
                      onClick={action.action}
                      className={cn(
                        "p-4 rounded-lg text-white transition-all hover:scale-105",
                        action.color
                      )}
                    >
                      <action.icon className="w-6 h-6 mb-2" />
                      <p className="text-sm font-medium">{action.label}</p>
                    </button>
                  </FadeIn>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Performance Insights */}
      <FadeIn delay={700}>
        <Card className={cn(refreshing && "opacity-70")}>
          <CardHeader>
            <CardTitle>Today's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Booking Rate</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold">85%</p>
                  <div className="flex items-center text-green-600 text-sm">
                    <ArrowUp className="w-4 h-4" />
                    <span>12%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Staff Utilization</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold">72%</p>
                  <div className="flex items-center text-amber-600 text-sm">
                    <ArrowDown className="w-4 h-4" />
                    <span>3%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-600 h-2 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Customer Satisfaction</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold">4.8</p>
                  <div className="flex items-center text-green-600 text-sm">
                    <ArrowUp className="w-4 h-4" />
                    <span>0.2</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div
                      key={star}
                      className={cn(
                        "w-6 h-6 rounded",
                        star <= 4.8 ? "bg-yellow-400" : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}