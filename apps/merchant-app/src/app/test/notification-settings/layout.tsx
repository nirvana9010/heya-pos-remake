'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { TimezoneProvider } from '@/contexts/timezone-context';
import { NotificationsProvider } from '@/contexts/notifications-context';

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TimezoneProvider>
        <NotificationsProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </NotificationsProvider>
      </TimezoneProvider>
    </AuthGuard>
  );
}