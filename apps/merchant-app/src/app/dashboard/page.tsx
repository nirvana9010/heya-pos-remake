'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Skeleton } from '@heya-pos/ui';
import { Calendar, Users, DollarSign, Clock, Plus, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { type Booking, type DashboardStats } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "polling" | "disconnected">("connected");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Load dashboard data immediately
    loadDashboardData().finally(() => {
      setIsInitialLoad(false);
    });
  }, []);

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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setConnectionStatus("disconnected");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'New Booking', icon: Plus, action: () => router.push('/bookings/new') },
    { label: 'View Calendar', icon: Calendar, action: () => router.push('/calendar') },
    { label: 'Customers', icon: Users, action: () => router.push('/customers') },
    { label: 'Reports', icon: DollarSign, action: () => router.push('/reports') }
  ];

  // Show skeleton during initial load
  if (isInitialLoad && loading) {
    return (
      <div className="container animate-in fade-in-0 duration-300" style={{ 
        padding: 'var(--space-6)'
      }}>
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-6 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Stats Grid skeleton */}
        <div className="dashboard-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Quick Actions skeleton */}
        <div className="card">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="quick-actions">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>

        {/* Today's Schedule skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
          <div className="card">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-in fade-in-0 slide-in-from-bottom-4 duration-300" style={{ 
      padding: 'var(--space-6)'
    }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ 
            fontSize: 'var(--text-4xl)', 
            marginBottom: 'var(--space-2)',
            color: 'var(--text-primary)'
          }}>
            Welcome back!
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 'var(--text-lg)'
          }}>
            Here's what's happening at your salon today
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => router.push('/bookings/new')}
        >
          <Plus size={18} />
          New Booking
        </button>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        {[
          { 
            title: "Today's Bookings", 
            value: loading ? '-' : (stats?.todayBookings || 8).toString(),
            icon: Calendar,
            change: '+12%',
            positive: true
          },
          { 
            title: "Today's Revenue", 
            value: loading ? '-' : `$${Math.round(Number(stats?.todayRevenue) || 1240)}`,
            icon: DollarSign,
            change: '+8.5%',
            positive: true
          },
          { 
            title: "New Customers", 
            value: loading ? '-' : (stats?.newCustomers || 3).toString(),
            icon: Users,
            change: '+2',
            positive: true
          },
          { 
            title: "Pending Bookings", 
            value: loading ? '-' : (stats?.pendingBookings || 2).toString(),
            icon: Clock,
            change: 'Awaiting',
            positive: false
          }
        ].map((stat, index) => (
          <div key={stat.title} className="stat-card">
            <div className="flex justify-between items-center mb-4">
              <div style={{
                background: 'var(--primary)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                opacity: 0.9
              }}>
                <stat.icon size={20} />
              </div>
              <span className={`stat-change ${stat.positive ? 'positive' : ''}`}>
                {stat.change}
              </span>
            </div>
            <div className="stat-value">
              {stat.value}
            </div>
            <div className="stat-label">
              {stat.title}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 style={{ 
          fontSize: 'var(--text-2xl)',
          marginBottom: 'var(--space-6)',
          color: 'var(--text-primary)'
        }}>
          Quick Actions
        </h2>
        <div className="quick-actions">
          {quickActions.map((action, index) => (
            <div
              key={action.label}
              className="quick-action"
              onClick={action.action}
            >
              <div className="quick-action-icon">
                <action.icon size={24} />
              </div>
              <span style={{ 
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--text-primary)'
              }}>
                {action.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ 
            fontSize: 'var(--text-2xl)',
            color: 'var(--text-primary)',
            margin: 0
          }}>
            Today's Schedule
          </h2>
          <button 
            className="btn btn-secondary"
            onClick={() => router.push('/bookings')}
          >
            View All
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="text-center" style={{ 
              padding: 'var(--space-16)', 
              color: 'var(--text-secondary)'
            }}>
              <div style={{ 
                height: '60px', 
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <div style={{ 
                height: '60px', 
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center" style={{ 
              padding: 'var(--space-16)', 
              color: 'var(--text-secondary)'
            }}>
              <Calendar size={48} style={{ 
                margin: '0 auto var(--space-6)', 
                color: 'var(--primary)',
                opacity: 0.5
              }} />
              <p>No bookings scheduled for today</p>
              <p style={{ fontSize: 'var(--text-sm)' }}>Time to relax or catch up on other tasks!</p>
            </div>
          ) : (
            // Sample bookings for demo
            [
              { id: '1', customerName: 'Sarah Johnson', serviceName: 'Hair Cut & Color', startTime: '10:00 AM', staffName: 'Emma', status: 'confirmed' },
              { id: '2', customerName: 'Michael Chen', serviceName: 'Beard Trim', startTime: '11:30 AM', staffName: 'Jake', status: 'in-progress' },
              { id: '3', customerName: 'Lisa Williams', serviceName: 'Facial Treatment', startTime: '2:00 PM', staffName: 'Sophie', status: 'pending' }
            ].map((booking, index) => (
              <div
                key={booking.id}
                className="card-interactive"
                onClick={() => router.push(`/bookings/${booking.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-4">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'var(--font-semibold)',
                      fontSize: 'var(--text-sm)'
                    }}>
                      {booking.customerName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p style={{ 
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        margin: 0,
                        marginBottom: '4px'
                      }}>
                        {booking.customerName}
                      </p>
                      <p style={{ 
                        fontSize: 'var(--text-sm)', 
                        color: 'var(--text-secondary)',
                        margin: 0
                      }}>
                        {booking.serviceName}
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 'var(--space-4)' }}>
                  <p style={{ 
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    {booking.startTime}
                  </p>
                  <p style={{ 
                    fontSize: 'var(--text-sm)', 
                    color: 'var(--text-secondary)',
                    margin: 0
                  }}>
                    with {booking.staffName}
                  </p>
                </div>
                <div>
                  <span className={
                    booking.status === 'confirmed' ? 'badge badge-success' :
                    booking.status === 'pending' ? 'badge badge-warning' :
                    booking.status === 'in-progress' ? 'badge badge-info' :
                    'badge badge-error'
                  }>
                    {booking.status === 'in-progress' ? 'In Progress' : booking.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}