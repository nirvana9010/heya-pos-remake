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
    // Check if user has Check-In Lite feature
    
    // Check-In Lite users: Redirect to check-ins
    if (isCheckInLite) {
      if (pathname === '/calendar' || pathname === '/bookings' || pathname === '/') {
        // Redirecting Check-In Lite user to /check-ins
        router.replace('/check-ins');
        return;
      }
    }
    
    // Non-Check-In Lite users: Redirect away from check-ins
    if (!isCheckInLite && pathname === '/check-ins') {
      // Redirecting non-Check-In Lite user away from /check-ins
      router.replace('/calendar');
      return;
    }
  }, [features, pathname, router]);
  
  return null;
}