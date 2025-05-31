'use client';

import { usePathname } from 'next/navigation';
import { DashboardLayout } from './layout/dashboard-layout';
import { AuthGuard } from './AuthGuard';

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
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}