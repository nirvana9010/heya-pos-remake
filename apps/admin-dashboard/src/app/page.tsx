"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, DollarSign, TrendingUp, Activity, AlertCircle, CheckCircle, Clock, MoreVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { StatCard } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { DataTable } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@heya-pos/ui";
import { mockApi, type Merchant } from "@heya-pos/shared";
import { ProtectedRoute } from "@/components/protected-route";

const systemAlerts = [
  { id: "1", type: "warning", message: "High server load detected on API cluster 2", time: "5 minutes ago" },
  { id: "2", type: "info", message: "Scheduled maintenance window: Sunday 2:00 AM - 4:00 AM AEDT", time: "1 hour ago" },
  { id: "3", type: "success", message: "Payment processing system upgrade completed successfully", time: "3 hours ago" },
];

  const merchantColumns = [
    {
      accessorKey: "businessName",
      header: "Merchant Name",
    },
    {
      accessorKey: "subscriptionPlan",
      header: "Plan",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.subscriptionPlan || 'basic'}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status;
        return (
          <Badge variant={status === "active" ? "default" : status === "inactive" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }: any) => {
        return new Date(row.original.createdAt).toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/merchants/${row.original.id}`)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Edit merchant:', row.original.id)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => console.log('Suspend merchant:', row.original.id)}
              className="text-destructive"
            >
              Suspend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    systemHealth: 98.5,
    activeBookings: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [merchantsData, dashboardStats] = await Promise.all([
        mockApi.getMerchants(),
        mockApi.getDashboardStats()
      ]);
      
      setMerchants(merchantsData);
      setStats({
        totalMerchants: merchantsData.length,
        activeMerchants: merchantsData.filter(m => m.status === 'active').length,
        totalUsers: Math.floor(Math.random() * 2000) + 1000,
        monthlyRevenue: dashboardStats.monthlyRevenue,
        systemHealth: 98.5,
        activeBookings: dashboardStats.todayBookings * 12,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage the entire Heya POS platform</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Merchants"
          value={loading ? '-' : stats.totalMerchants.toString()}
          description={loading ? 'Loading...' : `${stats.activeMerchants} active`}
          icon={<Building2 className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Total Users"
          value={loading ? '-' : stats.totalUsers.toLocaleString()}
          description="+12% from last month"
          icon={<Users className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Monthly Revenue"
          value={loading ? '-' : `$${stats.monthlyRevenue.toLocaleString()}`}
          description="+18% from last month"
          icon={<DollarSign className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="System Health"
          value={loading ? '-' : `${stats.systemHealth}%`}
          description="All systems operational"
          icon={<Activity className="h-4 w-4" />}
          trend="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Merchants */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Merchants</CardTitle>
            <CardDescription>Newly registered businesses on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading merchants...</p>
                </div>
              </div>
            ) : (
              <>
                <DataTable
                  columns={merchantColumns}
                  data={merchants.slice(0, 5)}
                />
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/merchants')}
                  >
                    View All Merchants
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Important notifications and system status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3">
                {alert.type === "warning" && <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                {alert.type === "info" && <Clock className="h-5 w-5 text-blue-600 mt-0.5" />}
                {alert.type === "success" && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Platform Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Statistics</CardTitle>
          <CardDescription>Real-time platform performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{loading ? '-' : stats.activeBookings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Active Bookings Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">99.9%</p>
              <p className="text-sm text-muted-foreground">API Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">142ms</p>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">8.4TB</p>
              <p className="text-sm text-muted-foreground">Data Processed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/merchants')}
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs">Add Merchant</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/users')}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Manage Users</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/system')}
            >
              <Activity className="h-5 w-5" />
              <span className="text-xs">System Health</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/reports')}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}