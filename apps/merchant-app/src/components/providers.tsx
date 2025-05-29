'use client';

import { usePathname } from 'next/navigation';
import { DashboardLayout } from './layout/dashboard-layout';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/pin';
  const isTestPage = pathname.startsWith('/test');

  if (isAuthPage || isTestPage) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}