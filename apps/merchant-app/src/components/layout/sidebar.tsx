'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@heya-pos/ui'
import { useTransition, useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Button } from '@heya-pos/ui'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Services', href: '/services', icon: Package },
  { name: 'Loyalty', href: '/loyalty', icon: Gift },
  { name: 'Payments', href: '/payments', icon: DollarSign },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)

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
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: 'var(--space-8)',
        height: '60px'
      }}>
        {!collapsed && (
          <div className="sidebar-logo">
            <Sparkles size={28} />
            <span style={{ fontSize: 'var(--text-xl)' }}>
              Heya
            </span>
          </div>
        )}
        {collapsed && (
          <Sparkles size={28} style={{ color: 'var(--primary)' }} />
        )}
        
        <button
          onClick={() => onToggle(!collapsed)}
          className="btn btn-ghost btn-sm"
          style={{
            padding: 'var(--space-2)'
          }}
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {navigation.map((item, index) => {
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
      </nav>

      {/* Logout Section */}
      <div style={{ 
        borderTop: '1px solid var(--border)', 
        paddingTop: 'var(--space-4)',
        marginTop: 'var(--space-4)'
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