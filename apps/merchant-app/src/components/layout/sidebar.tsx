'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@heya-pos/ui'
import { useTransition, useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Sparkles,
  Gift,
  Bell,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@heya-pos/ui'
import { useFeatures } from '../../lib/features/feature-service'

const allNavigation = [
  // Main navigation
  { name: 'Calendar', href: '/calendar', icon: Calendar, feature: 'bookings' },
  { name: 'Bookings', href: '/bookings', icon: Calendar, feature: 'bookings' },
  { name: 'Check-In', href: '/check-in', icon: CheckSquare, feature: 'check_in_only' },
  { name: 'Customers', href: '/customers', icon: Users, feature: 'customers' },
  { name: 'Staff', href: '/staff', icon: Users, feature: 'staff' },
  { name: 'Roster', href: '/roster', icon: Calendar, feature: 'roster' },
  { name: 'Services', href: '/services', icon: Package, feature: 'services' },
  { name: 'Payments', href: '/payments', icon: DollarSign, feature: 'payments' },
  // Bottom navigation
  { name: 'Loyalty', href: '/loyalty', icon: Gift, feature: 'loyalty', position: 'bottom' },
  { name: 'Reports', href: '/reports', icon: BarChart3, feature: 'reports', position: 'bottom' },
  { name: 'Notifications', href: '/notifications', icon: Bell, feature: 'notifications', position: 'bottom' },
  { name: 'Settings', href: '/settings', icon: Settings, feature: null, position: 'bottom' }, // Always visible
]

interface SidebarProps {
  collapsed: boolean
  onToggle: (collapsed: boolean) => void
}

export function Sidebar({ collapsed = false, onToggle = () => {} }: Partial<SidebarProps>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)
  const { hasFeature, loading: featuresLoading } = useFeatures()

  // Filter navigation based on features
  const filteredNavigation = useMemo(() => {
    const mainNav = allNavigation
      .filter(item => !item.position || item.position !== 'bottom')
      .filter(item => !item.feature || hasFeature(item.feature))
    
    const bottomNav = allNavigation
      .filter(item => item.position === 'bottom')
      .filter(item => !item.feature || hasFeature(item.feature))
    
    return { mainNav, bottomNav }
  }, [hasFeature, featuresLoading])

  const handleNavigation = (href: string) => {
    // Show loading state immediately
    setIsNavigating(true)
    
    // Use React's concurrent features to keep UI responsive
    startTransition(() => {
      // Prefetch the route first
      router.prefetch(href)
      
      // Then navigate after a micro delay to allow UI to update
      requestAnimationFrame(() => {
        router.push(href)
      })
    })
  }

  // Clear navigation state when route changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  return (
    <div 
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: collapsed ? '60px' : '240px',
        backgroundColor: '#f3f4f6',
        borderRight: '1px solid #e5e7eb',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transition: 'width 0.3s ease-in-out'
      }}>
      {/* Logo Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: '2rem',
        height: '60px'
      }}>
        {!collapsed && (
          <div className="sidebar-logo">
            <Sparkles size={28} />
            <span style={{ fontSize: '1.25rem' }}>
              Heya
            </span>
          </div>
        )}
        {collapsed && (
          <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
        )}
        
        <button
          onClick={() => onToggle(!collapsed)}
          className="btn btn-ghost btn-sm"
          style={{
            padding: '0.5rem'
          }}
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {/* Main Navigation */}
        <div style={{ flex: 1 }}>
          {filteredNavigation.mainNav.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`nav-item ${isActive ? 'active' : ''} ${(isPending || isNavigating) ? 'opacity-50' : ''}`}
                disabled={isPending || isNavigating}
              >
                <item.icon size={20} />
                {!collapsed && (
                  <span>
                    {item.name}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Separator - only show if bottom nav has items */}
        {filteredNavigation.bottomNav.length > 0 && (
          <div style={{ 
            borderTop: '1px solid var(--color-border)', 
            marginTop: '1rem',
            marginBottom: '1rem'
          }} />
        )}
        
        {/* Bottom Navigation */}
        <div>
          {filteredNavigation.bottomNav.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`nav-item ${isActive ? 'active' : ''} ${(isPending || isNavigating) ? 'opacity-50' : ''}`}
                disabled={isPending || isNavigating}
              >
                <item.icon size={20} />
                {!collapsed && (
                  <span>
                    {item.name}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Logout Section */}
      <div style={{ 
        borderTop: '1px solid var(--color-border)', 
        paddingTop: '1rem',
        marginTop: '1rem'
      }}>
        <button
          className="nav-item"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('merchant');
            localStorage.removeItem('user');
            sessionStorage.removeItem('pin_verified');
            sessionStorage.removeItem('pin_verified_at');
            window.location.href = '/login';
          }}
        >
          <LogOut size={20} />
          {!collapsed && (
            <span>
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  )
}