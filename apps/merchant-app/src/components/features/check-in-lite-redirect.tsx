'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface CheckInLiteRedirectProps {
  features?: {
    enabledFeatures: string[];
    packageName?: string;
  } | null;
}

export function CheckInLiteRedirect({ features }: CheckInLiteRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (!features) return;
    
    const isCheckInLite = features.enabledFeatures.includes('check_in_only');
    console.log('[CheckInLiteRedirect] isCheckInLite:', isCheckInLite, 'pathname:', pathname);
    
    // Check-In Lite users: Redirect to check-ins
    if (isCheckInLite) {
      if (pathname === '/calendar' || pathname === '/bookings' || pathname === '/') {
        console.log('[CheckInLiteRedirect] Redirecting Check-In Lite user to /check-ins');
        router.replace('/check-ins');
        return;
      }
    }
    
    // Non-Check-In Lite users: Redirect away from check-ins
    if (!isCheckInLite && pathname === '/check-ins') {
      console.log('[CheckInLiteRedirect] Redirecting non-Check-In Lite user away from /check-ins');
      router.replace('/calendar');
      return;
    }
  }, [features, pathname, router]);
  
  return null;
}