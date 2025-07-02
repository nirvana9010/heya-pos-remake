'use client';

import dynamic from 'next/dynamic';
import { TablePageLoader } from '@/components/PageLoader';

// Dynamically import the page content
const BookingsManager = dynamic(
  () => import('./BookingsManager'),
  { 
    loading: () => <TablePageLoader />
  }
);

// This lightweight wrapper loads instantly
export default function BookingsPage() {
  return <BookingsManager />;
}