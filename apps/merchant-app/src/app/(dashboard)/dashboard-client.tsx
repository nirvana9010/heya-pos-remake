'use client';

import { useEffect, useState } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Enable real-time notifications for all dashboard pages
  useRealtimeNotifications();
  
  return (
    <TooltipProvider>
      <ClearOldRoutes />
      <CheckInLiteRedirect features={features} />
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar
          features={features}
          collapsed={sidebarCollapsed}
          onToggle={setSidebarCollapsed}
          isMobile={isMobile}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        {isMobile && mobileSidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 39 }}
          />
        )}
        <div
          className="flex-1 flex flex-col"
          style={{ marginLeft: isMobile ? '0' : sidebarCollapsed ? '60px' : '240px' }}
        >
          <Topbar
            isMobile={isMobile}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
