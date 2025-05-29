'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@heya-pos/ui'
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
} from 'lucide-react'
import { Button } from '@heya-pos/ui'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Services', href: '/services', icon: Package },
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
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {!collapsed && (
                <span>
                  {item.name}
                </span>
              )}
            </Link>
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