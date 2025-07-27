import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFeatures } from '../../lib/features/feature-service';

interface RouteGuardProps {
  children: React.ReactNode;
  fallbackRoute?: string;
}

export function RouteGuard({ children, fallbackRoute = '/check-in' }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccessRoute, loading, features } = useFeatures();

  useEffect(() => {
    if (!loading && features && !canAccessRoute(pathname)) {
      router.replace(fallbackRoute);
    }
  }, [pathname, loading, features, canAccessRoute, router, fallbackRoute]);

  // Show loading state while checking features
  if (loading || !features) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If can't access, don't render children (redirect will happen)
  if (!canAccessRoute(pathname)) {
    return null;
  }

  return <>{children}</>;
}