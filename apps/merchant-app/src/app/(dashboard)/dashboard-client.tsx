'use client';

import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { TooltipProvider } from '@heya-pos/ui';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { CheckInLiteRedirect } from '@/components/features/check-in-lite-redirect';
import { ClearOldRoutes } from '@/components/features/clear-old-routes';

interface MerchantFeatures {
  enabledFeatures: string[];
  disabledFeatures: string[];
  overrides: Record<string, any>;
  packageFeatures: string[];
  packageName: string;
}

export default function DashboardClient({
  children,
  features,
}: {
  children: React.ReactNode;
  features: MerchantFeatures | null;
}) {
  // Enable real-time notifications for all dashboard pages
  useRealtimeNotifications();
  
  return (
    <TooltipProvider>
      <ClearOldRoutes />
      <CheckInLiteRedirect features={features} />
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar features={features} />
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