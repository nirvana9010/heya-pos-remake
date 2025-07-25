'use client';

import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { TooltipProvider } from '@heya-pos/ui';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { RouteGuard } from '@/components/features/RouteGuard';
import { useEffect } from 'react';
import { featureService } from '@/lib/features/feature-service';

export default function DashboardClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enable real-time notifications for all dashboard pages
  useRealtimeNotifications();
  
  // Load features on mount
  useEffect(() => {
    featureService.loadFeatures();
  }, []);
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col" style={{ marginLeft: '240px' }}>
          <Topbar />
          <main className="flex-1 overflow-auto">
            <RouteGuard>
              {children}
            </RouteGuard>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}