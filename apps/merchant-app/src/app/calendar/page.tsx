'use client';

import dynamic from 'next/dynamic';
import { PageLoader } from '@/components/PageLoader';

// Dynamically import the page content
const CalendarPageContent = dynamic(
  () => import('./CalendarPageContent'),
  { 
    loading: () => <PageLoader pageName="Calendar" />,
    ssr: false // Disable SSR for faster client-side navigation
  }
);

// This lightweight wrapper loads instantly
export default function CalendarPage() {
  return <CalendarPageContent />;
}