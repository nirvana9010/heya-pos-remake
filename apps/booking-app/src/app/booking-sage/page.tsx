import { Suspense } from 'react';
import BookingPageClient from '../booking/BookingPageClient';

export default function BookingSagePage() {
  return (
    <div className="theme-sage-blush">
      <Suspense fallback={<div>Loading...</div>}>
        <BookingPageClient />
      </Suspense>
    </div>
  );
}