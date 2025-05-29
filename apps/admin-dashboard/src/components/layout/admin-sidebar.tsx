'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@heya-pos/ui'
import {
  Building2,
  Users,
  Shield,
  Database,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  UserCog,
  FileText,
  Bell,
} from 'lucide-react'
import { Button } from '@heya-pos/ui'
import { useState } from 'react'

const navigation = [
  { name: 'Overview', href: '/admin', icon: Activity },
  { name: 'Merchants', href: '/admin/merchants', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Staff', href: '/admin/staff', icon: UserCog },
  { name: 'Access Control', href: '/admin/access', icon: Shield },
  { name: 'Audit Logs', href: '/admin/logs', icon: FileText },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Database', href: '/admin/database', icon: Database },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div>
            <h2 className="text-xl font-bold">Heya Admin</h2>
            <p className="text-xs text-slate-400">System Control</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800"
        >
          {collapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center'
              )}
            >
              <item.icon
                className={cn(
                  'flex-shrink-0',
                  collapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'
                )}
              />
              {!collapsed && item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut
            className={cn(
              'flex-shrink-0',
              collapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'
            )}
          />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </div>
  )
}