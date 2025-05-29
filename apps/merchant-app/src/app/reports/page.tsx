"use client";

import { useState } from "react";
import { Calendar, Download, TrendingUp, Users, DollarSign, Clock, BarChart3, Activity } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { StatCard } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";

interface ReportData {
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    loyaltyMembers: number;
  };
  services: {
    name: string;
    bookings: number;
    revenue: number;
  }[];
  staff: {
    name: string;
    bookings: number;
    revenue: number;
    utilization: number;
  }[];
}

const mockReportData: ReportData = {
  revenue: {
    daily: 1250,
    weekly: 8500,
    monthly: 32000,
    yearly: 385000,
  },
  bookings: {
    total: 156,
    completed: 142,
    cancelled: 8,
    noShow: 6,
  },
  customers: {
    total: 524,
    new: 42,
    returning: 482,
    loyaltyMembers: 186,
  },
  services: [
    { name: "Haircut & Style", bookings: 45, revenue: 2925 },
    { name: "Hair Color", bookings: 28, revenue: 4200 },
    { name: "Facial Treatment", bookings: 32, revenue: 2880 },
    { name: "Manicure", bookings: 38, revenue: 1710 },
    { name: "Massage", bookings: 13, revenue: 1560 },
  ],
  staff: [
    { name: "Emma Wilson", bookings: 42, revenue: 3150, utilization: 85 },
    { name: "James Brown", bookings: 38, revenue: 2850, utilization: 78 },
    { name: "Sophie Chen", bookings: 35, revenue: 2625, utilization: 72 },
    { name: "Michael Davis", bookings: 28, revenue: 2100, utilization: 58 },
  ],
};

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState("monthly");
  const [selectedTab, setSelectedTab] = useState("overview");

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${mockReportData.revenue[timeRange as keyof typeof mockReportData.revenue].toLocaleString()}`}
          description={`${timeRange === "daily" ? "Today" : `This ${timeRange.slice(0, -2)}`}`}
          icon={<DollarSign className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Total Bookings"
          value={mockReportData.bookings.total}
          description={`${mockReportData.bookings.completed} completed`}
          icon={<Calendar className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Active Customers"
          value={mockReportData.customers.total}
          description={`${mockReportData.customers.new} new this month`}
          icon={<Users className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Avg. Booking Value"
          value={`$${Math.round(mockReportData.revenue.monthly / mockReportData.bookings.total)}`}
          description="+5% from last month"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Most popular services by bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockReportData.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${service.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {((service.revenue / mockReportData.revenue.monthly) * 100).toFixed(0)}% of revenue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
            <CardDescription>Bookings and revenue by staff member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockReportData.staff.map((staff, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-muted-foreground">{staff.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${staff.revenue.toLocaleString()}</p>
                      <Badge variant="outline" className="ml-2">
                        {staff.utilization}% utilized
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${staff.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Statistics</CardTitle>
          <CardDescription>Breakdown of booking outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{mockReportData.bookings.completed}</p>
              <p className="text-sm text-green-800">Completed</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{mockReportData.bookings.cancelled}</p>
              <p className="text-sm text-yellow-800">Cancelled</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{mockReportData.bookings.noShow}</p>
              <p className="text-sm text-red-800">No Show</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {Math.round((mockReportData.bookings.completed / mockReportData.bookings.total) * 100)}%
              </p>
              <p className="text-sm text-blue-800">Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CustomersTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Customers"
          value={mockReportData.customers.total}
          description="All time"
          icon={<Users className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="New Customers"
          value={mockReportData.customers.new}
          description="This month"
          icon={<Users className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Loyalty Members"
          value={mockReportData.customers.loyaltyMembers}
          description={`${Math.round((mockReportData.customers.loyaltyMembers / mockReportData.customers.total) * 100)}% of total`}
          icon={<Activity className="h-4 w-4" />}
          trend="up"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Retention</CardTitle>
          <CardDescription>Customer visit frequency and loyalty metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Returning Customer Rate</p>
                <p className="text-sm text-muted-foreground">Customers with 2+ visits</p>
              </div>
              <p className="text-2xl font-bold">
                {Math.round((mockReportData.customers.returning / mockReportData.customers.total) * 100)}%
              </p>
            </div>
            <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Average Visit Frequency</p>
                <p className="text-sm text-muted-foreground">Visits per customer per month</p>
              </div>
              <p className="text-2xl font-bold">2.3</p>
            </div>
            <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Customer Lifetime Value</p>
                <p className="text-sm text-muted-foreground">Average revenue per customer</p>
              </div>
              <p className="text-2xl font-bold">$485</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Business insights and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        
        <TabsContent value="customers" className="mt-6">
          <CustomersTab />
        </TabsContent>
        
        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Financial Reports
              </CardTitle>
              <CardDescription>Detailed revenue and expense analytics coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Advanced financial reporting will be available in the next update
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}