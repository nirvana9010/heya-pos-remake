'use client';

import { usePathname } from 'next/navigation';
import { DashboardLayout } from './layout/dashboard-layout';
import { AuthGuard } from './AuthGuard';
import { PrefetchManager } from './PrefetchManager';
import { PerformanceMonitor } from './PerformanceMonitor';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/pin';
  const isTestPage = pathname.startsWith('/test');

  // Only wrap protected routes in AuthGuard
  if (isAuthPage || isTestPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <PerformanceMonitor />
      <PrefetchManager />
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}