import DashboardClient from './dashboard-client';
import { getServerFeatures } from '@/lib/features/server-features';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch features on the server
  const features = await getServerFeatures();
  
  return (
    <DashboardClient features={features}>
      {children}
    </DashboardClient>
  );
}