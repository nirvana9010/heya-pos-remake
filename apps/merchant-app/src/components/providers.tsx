'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from './AuthGuard';
import { PrefetchManager } from './PrefetchManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TimezoneProvider } from '@/contexts/timezone-context';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { QueryProvider } from '@/lib/query/query-provider';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { ClearCorruptedAuth } from './ClearCorruptedAuth';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';
  const isTestPage = pathname.startsWith('/test');
  const needsNotifications = pathname === '/test-notifications';

  return (
    <QueryProvider>
      <ClearCorruptedAuth />
      <AuthProvider>
        {/* Only wrap protected routes in AuthGuard and layout */}
        {isAuthPage ? (
          children
        ) : isTestPage ? (
          // Test pages may need notifications context
          needsNotifications ? (
            <NotificationsProvider>
              {children}
            </NotificationsProvider>
          ) : (
            children
          )
        ) : (
          <AuthGuard>
            <TimezoneProvider>
              <NotificationsProvider>
                <PerformanceMonitor />
                <PrefetchManager />
                {children}
              </NotificationsProvider>
            </TimezoneProvider>
          </AuthGuard>
        )}
      </AuthProvider>
    </QueryProvider>
  );
}