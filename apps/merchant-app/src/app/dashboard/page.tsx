'use client';

import { useRouter } from 'next/navigation';
import { StatCard } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Skeleton } from '@heya-pos/ui';
import { Calendar, Users, DollarSign, Clock, Plus, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { useDashboardStats, useTodayBookings } from '@/lib/query/hooks';

export default function DashboardPage() {
  const router = useRouter();
  
  // Use React Query hooks for data fetching
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    isRefetching: statsRefetching
  } = useDashboardStats();
  
  const { 
    data: todayBookings = [], 
    isLoading: bookingsLoading, 
    error: bookingsError,
    isRefetching: bookingsRefetching
  } = useTodayBookings();

  // Determine overall loading state
  const isInitialLoad = statsLoading || bookingsLoading;
  const isRefreshing = statsRefetching || bookingsRefetching;
  
  // Handle errors gracefully - don't let bookings error crash the whole page
  const hasStatsError = !!statsError;
  const hasBookingsError = !!bookingsError;
  
  // Use empty array if bookings failed to load
  const safeBookings = hasBookingsError ? [] : todayBookings;

  const quickActions = [
    { label: 'New Booking', icon: Plus, action: () => router.push('/bookings/new') },
    { label: 'View Calendar', icon: Calendar, action: () => router.push('/calendar') },
    { label: 'Customers', icon: Users, action: () => router.push('/customers') },
    { label: 'Reports', icon: DollarSign, action: () => router.push('/reports') }
  ];

  // Show skeleton during initial load
  if (isInitialLoad) {
    return (
      <div className="container animate-in fade-in-0 duration-300">
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
    <ErrorBoundary>
      <div className="container animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)'
            }}>
              Welcome back!
            </h1>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              fontSize: '1.125rem'
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
            value: isRefreshing ? '-' : (stats?.todayBookings || safeBookings.length || 0).toString(),
            icon: Calendar,
            change: stats?.bookingGrowth !== undefined 
              ? `${stats.bookingGrowth >= 0 ? '+' : ''}${stats.bookingGrowth.toFixed(1)}%`
              : '-',
            positive: (stats?.bookingGrowth || 0) >= 0
          },
          { 
            title: "Today's Revenue", 
            value: isRefreshing ? '-' : `$${Math.round(Number(stats?.todayRevenue) || 0)}`,
            icon: DollarSign,
            change: stats?.revenueGrowth !== undefined
              ? `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%`
              : '-',
            positive: (stats?.revenueGrowth || 0) >= 0
          },
          { 
            title: "New Customers", 
            value: isRefreshing ? '-' : (stats?.newCustomers || 0).toString(),
            icon: Users,
            change: stats?.customerGrowth !== undefined
              ? `${stats.customerGrowth >= 0 ? '+' : ''}${stats.customerGrowth.toFixed(1)}%`
              : '-',
            positive: (stats?.customerGrowth || 0) >= 0
          },
          { 
            title: "Pending Bookings", 
            value: isRefreshing ? '-' : (stats?.pendingBookings || 0).toString(),
            icon: Clock,
            change: stats?.pendingBookings 
              ? `${stats.pendingBookings} waiting`
              : 'None',
            positive: false
          }
        ].map((stat, index) => (
          <div key={stat.title} className="stat-card">
            <div className="flex justify-between items-center mb-4">
              <div style={{
                background: 'var(--color-primary)',
                padding: '0.5rem',
                borderRadius: '0.5rem',
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
          fontSize: '1.5rem',
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)'
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
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--color-text-primary)'
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
            fontSize: '1.5rem',
            color: 'var(--color-text-primary)',
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
          {isRefreshing ? (
            <div className="text-center" style={{ 
              padding: '4rem', 
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{ 
                height: '60px', 
                backgroundColor: 'var(--color-background-soft)',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
              <div style={{ 
                height: '60px', 
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></div>
            </div>
          ) : hasBookingsError ? (
            <div className="text-center" style={{ 
              padding: '4rem', 
              color: 'var(--color-text-secondary)'
            }}>
              <Calendar size={48} style={{ 
                margin: '0 auto 1.5rem', 
                color: 'var(--color-error)',
                opacity: 0.5
              }} />
              <p>Unable to load today's bookings</p>
              <p style={{ fontSize: '0.875rem' }}>There's an issue with the booking system. Please try again later.</p>
            </div>
          ) : safeBookings.length === 0 ? (
            <div className="text-center" style={{ 
              padding: '4rem', 
              color: 'var(--color-text-secondary)'
            }}>
              <Calendar size={48} style={{ 
                margin: '0 auto 1.5rem', 
                color: 'var(--color-primary)',
                opacity: 0.5
              }} />
              <p>No bookings scheduled for today</p>
              <p style={{ fontSize: '0.875rem' }}>Time to relax or catch up on other tasks!</p>
            </div>
          ) : (
            // Use real booking data from React Query
            safeBookings.map((booking, index) => (
              <div
                key={booking.id}
                className="card-interactive"
                onClick={() => router.push(`/bookings/${booking.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-4">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}>
                      {booking.customerName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p style={{ 
                        fontWeight: '600',
                        color: 'var(--color-text-primary)',
                        margin: 0,
                        marginBottom: '4px'
                      }}>
                        {booking.customerName}
                      </p>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        color: 'var(--color-text-secondary)',
                        margin: 0
                      }}>
                        {booking.serviceName}
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                  <p style={{ 
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    {booking.startTime}
                  </p>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--color-text-secondary)',
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
    </ErrorBoundary>
  );
}