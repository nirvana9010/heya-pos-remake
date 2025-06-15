'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function MerchantSageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-blush-sage">
      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
}