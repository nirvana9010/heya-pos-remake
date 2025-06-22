'use client';

import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { TooltipProvider } from '@heya-pos/ui';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';

export default function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enable real-time notifications for all dashboard pages
  useRealtimeNotifications();
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col" style={{ marginLeft: '240px' }}>
          <Topbar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}