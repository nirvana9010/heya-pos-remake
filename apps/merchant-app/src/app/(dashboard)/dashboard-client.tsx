'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { TooltipProvider } from '@heya-pos/ui';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { CheckInLiteRedirect } from '@/components/features/check-in-lite-redirect';
import { ClearOldRoutes } from '@/components/features/clear-old-routes';
import { REPORTS_WHATS_NEW_STORAGE_KEYS } from '@/lib/constants/reports-whats-new';

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
  const [showReportsSpotlight, setShowReportsSpotlight] = useState(false);
  const [reportsSpotlightRect, setReportsSpotlightRect] = useState<DOMRect | null>(null);
  const [reportsSpotlightPending, setReportsSpotlightPending] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      setViewportWidth(window.innerWidth || 1280);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(REPORTS_WHATS_NEW_STORAGE_KEYS.dismissed) === '1';
    const pending = window.localStorage.getItem(REPORTS_WHATS_NEW_STORAGE_KEYS.pending) === '1';
    setReportsSpotlightPending(!dismissed && pending);
  }, []);

  useEffect(() => {
    if (!reportsSpotlightPending || showReportsSpotlight) return;

    if (!isMobile && sidebarCollapsed) {
      setSidebarCollapsed(false);
      return;
    }

    if (isMobile && !mobileSidebarOpen) {
      setMobileSidebarOpen(true);
      return;
    }

    const target = document.querySelector('[data-tour="reports-nav"]') as HTMLElement | null;
    if (!target) return;

    setReportsSpotlightRect(target.getBoundingClientRect());
    setShowReportsSpotlight(true);
  }, [isMobile, mobileSidebarOpen, reportsSpotlightPending, showReportsSpotlight, sidebarCollapsed]);

  useEffect(() => {
    if (!showReportsSpotlight) return;

    const syncSpotlightRect = () => {
      const target = document.querySelector('[data-tour="reports-nav"]') as HTMLElement | null;
      if (!target) return;
      setReportsSpotlightRect(target.getBoundingClientRect());
    };

    syncSpotlightRect();
    window.addEventListener('resize', syncSpotlightRect);
    window.addEventListener('scroll', syncSpotlightRect, true);

    return () => {
      window.removeEventListener('resize', syncSpotlightRect);
      window.removeEventListener('scroll', syncSpotlightRect, true);
    };
  }, [showReportsSpotlight]);

  const dismissReportsSpotlight = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REPORTS_WHATS_NEW_STORAGE_KEYS.dismissed, '1');
      window.localStorage.removeItem(REPORTS_WHATS_NEW_STORAGE_KEYS.pending);
    }

    setShowReportsSpotlight(false);
    setReportsSpotlightPending(false);
    setReportsSpotlightRect(null);
  };

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
      {showReportsSpotlight && reportsSpotlightRect && (
        <div className="fixed inset-0" style={{ zIndex: 80 }}>
          <div
            className="fixed rounded-xl ring-2 ring-blue-400"
            style={{
              left: `${reportsSpotlightRect.left - 6}px`,
              top: `${reportsSpotlightRect.top - 6}px`,
              width: `${reportsSpotlightRect.width + 12}px`,
              height: `${reportsSpotlightRect.height + 12}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="fixed w-[320px] max-w-[calc(100vw-2rem)] rounded-lg bg-white p-4 shadow-2xl"
            style={{
              left: isMobile ? '1rem' : `${Math.min(reportsSpotlightRect.right + 16, viewportWidth - 336)}px`,
              top: isMobile
                ? `${Math.max(reportsSpotlightRect.bottom + 16, 16)}px`
                : `${Math.max(reportsSpotlightRect.top - 8, 16)}px`,
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">Updated Reports</h3>
              <button
                type="button"
                aria-label="Dismiss reports update message"
                onClick={dismissReportsSpotlight}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-700">
              New Update: Improved Reports. Check it out!
            </p>
            <button
              type="button"
              onClick={dismissReportsSpotlight}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
