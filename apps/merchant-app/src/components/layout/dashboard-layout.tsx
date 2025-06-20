'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Enable real-time notifications
  useRealtimeNotifications()

  return (
    <div className="merchant-layout" data-theme="light">
      <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ 
          flex: 1, 
          overflowY: 'auto',
          background: 'var(--color-background-primary)'
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}