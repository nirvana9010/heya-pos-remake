'use client';

import dynamic from 'next/dynamic';
import { TablePageLoader } from '@/components/PageLoader';

// Dynamically import the page content
const BookingsPageContent = dynamic(
  () => import('./BookingsPageContent'),
  { 
    loading: () => <TablePageLoader />,
    ssr: false // Disable SSR for faster client-side navigation
  }
);

// This lightweight wrapper loads instantly
export default function BookingsPage() {
  return <BookingsPageContent />;
}