'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/contexts/booking-context';

export default function NewBookingPage() {
  const router = useRouter();
  const { openBookingSlideout } = useBooking();

  useEffect(() => {
    // Redirect to bookings page and open the slideout
    router.push('/bookings');
    // Small delay to ensure navigation completes before opening slideout
    setTimeout(() => {
      openBookingSlideout();
    }, 100);
  }, [router, openBookingSlideout]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-muted-foreground">Redirecting to bookings...</p>
      </div>
    </div>
  );
}