"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/clients";
import { 
  Search, Download, CreditCard, DollarSign, TrendingUp, RefreshCw, 
  CheckCircle, XCircle, Clock, RotateCcw, Banknote, Calendar,
  MoreVertical, FileText, Mail, Filter, ChevronDown, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus, CreditCard as CardIcon
} from "lucide-react";
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { DataTable } from "@heya-pos/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { formatDate } from "@heya-pos/utils";
import { cn } from "@heya-pos/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { PinVerificationDialog } from "@heya-pos/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@heya-pos/ui";
import { useAuth } from "@/lib/auth/auth-provider";

interface Payment {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  method: "cash" | "card-tyro";
  status: "completed" | "pending" | "failed" | "refunded";
  processedAt: Date;
  type?: "booking" | "product" | "tip";
  customerId?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName?: string;
  order?: any;
}

// Get current date for mock data
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

// Enhanced mock data with current dates
const mockPayments: Payment[] = [
  {
    id: "1",
    invoiceNumber: "INV-2025-001",
    customerName: "Sarah Johnson",
    amount: 150.00,
    method: "card-tyro",
    status: "completed",
    processedAt: new Date(today.setHours(10, 30, 0, 0)),
    type: "booking",
    customerId: "cust_001"
  },
  {
    id: "2",
    invoiceNumber: "INV-2025-002",
    customerName: "Michael Chen",
    amount: 75.00,
    method: "cash",
    status: "completed",
    processedAt: new Date(today.setHours(11, 45, 0, 0)),
    type: "booking",
    customerId: "cust_002"
  },
  {
    id: "3",
    invoiceNumber: "INV-2025-003",
    customerName: "Emily Brown",
    amount: 200.00,
    method: "card-tyro",
    status: "pending",
    processedAt: new Date(today.setHours(14, 15, 0, 0)),
    type: "booking",
    customerId: "cust_003"
  },
  {
    id: "4",
    invoiceNumber: "INV-2025-004",
    customerName: "David Wilson",
    amount: 90.00,
    method: "card-tyro",
    status: "refunded",
    processedAt: new Date(yesterday.setHours(16, 0, 0, 0)),
    type: "product",
    customerId: "cust_004"
  },
  {
    id: "5",
    invoiceNumber: "INV-2025-005",
    customerName: "Lisa Martinez",
    amount: 120.00,
    method: "cash",
    status: "completed",
    processedAt: new Date(today.setHours(9, 15, 0, 0)),
    type: "booking",
    customerId: "cust_005"
  },
  {
    id: "6",
    invoiceNumber: "INV-2025-006",
    customerName: "James Anderson",
    amount: 25.00,
    method: "card-tyro",
    status: "completed",
    processedAt: new Date(today.setHours(13, 0, 0, 0)),
    type: "tip",
    customerId: "cust_006"
  },
  {
    id: "7",
    invoiceNumber: "INV-2025-007",
    customerName: "Jennifer White",
    amount: 180.00,
    method: "card-tyro",
    status: "completed",
    processedAt: new Date(today.setHours(15, 30, 0, 0)),
    type: "booking",
    customerId: "cust_007"
  },
  {
    id: "8",
    invoiceNumber: "INV-2025-008",
    customerName: "Robert Garcia",
    amount: 95.00,
    method: "cash",
    status: "completed",
    processedAt: new Date(today.setHours(16, 45, 0, 0)),
    type: "booking",
    customerId: "cust_008"
  },
  {
    id: "9",
    invoiceNumber: "INV-2025-009",
    customerName: "Maria Rodriguez",
    amount: 220.00,
    method: "card-tyro",
    status: "completed",
    processedAt: new Date(yesterday.setHours(11, 0, 0, 0)),
    type: "booking",
    customerId: "cust_009"
  },
  {
    id: "10",
    invoiceNumber: "INV-2025-010",
    customerName: "William Taylor",
    amount: 45.00,
    method: "cash",
    status: "completed",
    processedAt: new Date(yesterday.setHours(12, 15, 0, 0)),
    type: "product",
    customerId: "cust_010"
  },
  {
    id: "11",
    invoiceNumber: "INV-2025-011",
    customerName: "Linda Davis",
    amount: 165.00,
    method: "card-tyro",
    status: "completed",
    processedAt: new Date(yesterday.setHours(13, 30, 0, 0)),
    type: "booking",
    customerId: "cust_011"
  },
  {
    id: "12",
    invoiceNumber: "INV-2025-012",
    customerName: "Charles Miller",
    amount: 35.00,
    method: "cash",
    status: "failed",
    processedAt: new Date(yesterday.setHours(14, 0, 0, 0)),
    type: "tip",
    customerId: "cust_012"
  },
  {
    id: "13",
    invoiceNumber: "INV-2025-013",
    customerName: "Patricia Moore",
    amount: 130.00,
    method: "card-tyro",
    status: "completed",
    processedAt: new Date(twoDaysAgo.setHours(10, 0, 0, 0)),
    type: "booking",
    customerId: "cust_013"
  },
  {
    id: "14",
    invoiceNumber: "INV-2025-014",
    customerName: "Christopher Jackson",
    amount: 85.00,
    method: "cash",
    status: "completed",
    processedAt: new Date(twoDaysAgo.setHours(11, 30, 0, 0)),
    type: "booking",
    customerId: "cust_014"
  },
  {
    id: "15",
    invoiceNumber: "INV-2025-015",
    customerName: "Barbara Martinez",
    amount: 195.00,
    method: "card-tyro",
    status: "refunded",
    processedAt: new Date(twoDaysAgo.setHours(14, 45, 0, 0)),
    type: "booking",
    customerId: "cust_015"
  }
];

// Mock sparkline data (7 days)
const mockSparklineData = {
  today: [400, 380, 420, 450, 470, 420, 425],
  week: [2500, 2700, 2600, 2900, 2800, 2750, 2850],
  month: [11000, 11500, 12000, 11800, 12200, 12300, 12500],
  pending: [150, 180, 200, 190, 210, 180, 200]
};

// Simple sparkline component
const Sparkline = ({ data, color = "text-primary" }: { data: number[], color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  const height = 32;
  const width = 80;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className={cn("transition-all", color)}
      />
    </svg>
  );
};

// Enhanced stat card component
const EnhancedStatCard = ({ 
  title, 
  value, 
  trend, 
  trendValue,
  icon,
  sparklineData,
  accentColor = "primary"
}: {
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  icon: React.ReactNode;
  sparklineData: number[];
  accentColor?: "primary" | "success" | "warning" | "neutral";
}) => {
  const trendIcon = trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : 
                    trend === "down" ? <ArrowDownRight className="h-4 w-4" /> : 
                    <Minus className="h-4 w-4" />;
  
  const trendColor = trend === "up" ? "text-green-600" : 
                     trend === "down" ? "text-red-600" : 
                     "text-gray-600";
  
  const accentColors = {
    primary: "from-primary/5 to-primary/10 border-primary/20",
    success: "from-green-50 to-green-100 border-green-200",
    warning: "from-yellow-50 to-yellow-100 border-yellow-200",
    neutral: "from-gray-50 to-gray-100 border-gray-200"
  };
  
  const sparklineColors = {
    primary: "text-primary",
    success: "text-green-600",
    warning: "text-yellow-600",
    neutral: "text-gray-600"
  };
  
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      "bg-gradient-to-br",
      accentColors[accentColor]
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="p-2 rounded-lg bg-background/50">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold tracking-tight">
          {value}
        </div>
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center text-sm font-medium", trendColor)}>
            {trendIcon}
            <span className="ml-1">{trendValue}</span>
          </div>
          <div className="flex items-center">
            <Sparkline data={sparklineData} color={sparklineColors[accentColor]} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [verifiedStaff, setVerifiedStaff] = useState<any>(null);
  const { toast } = useToast();
  const { merchant } = useAuth();
  
  
  // Fetch real payments data
  const { data: paymentsResponse, isLoading: isLoadingPayments, refetch, error } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await apiClient.getPayments();
      return response;
    },
  });

  // Fetch location data
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const locs = await apiClient.getLocations();
      return locs;
    },
  });

  // Fetch merchant profile
  const { data: merchantProfile } = useQuery({
    queryKey: ['merchantProfile'],
    queryFn: async () => {
      const profile = await apiClient.getMerchantProfile();
      return profile;
    },
  });

  const primaryLocation = locations?.[0];

  // Transform API data to match the Payment interface
  const payments = useMemo(() => {
    if (!paymentsResponse || !Array.isArray(paymentsResponse.payments)) {
      return [];
    }
    
    return paymentsResponse.payments.map(payment => ({
      id: payment.id,
      invoiceNumber: payment.order?.orderNumber || `PAY-${payment.id.slice(0, 8)}`,
      customerName: payment.order?.customer ? 
        `${payment.order.customer.firstName} ${payment.order.customer.lastName || ''}`.trim() : 
        'Unknown Customer',
      amount: parseFloat(payment.amount),
      method: payment.paymentMethod === 'CASH' ? 'cash' : 'card-tyro',
      status: payment.status.toLowerCase() as 'completed' | 'pending' | 'failed' | 'refunded',
      processedAt: new Date(payment.processedAt),
      type: payment.order?.bookingId ? 'booking' : 'product',
      customerId: payment.order?.customerId,
      customerPhone: payment.order?.customer?.phone || payment.order?.customer?.mobile || '',
      customerEmail: payment.order?.customer?.email || '',
      serviceName: payment.order?.items?.[0]?.name || 
        payment.order?.items?.[0]?.serviceName ||
        payment.order?.booking?.services?.[0]?.service?.name ||
        payment.order?.booking?.serviceName || 
        '',
      order: payment.order,
    }));
  }, [paymentsResponse]);

  // Calculate totals and trends from real data
  const { todayTotal, weekTotal, monthTotal, pendingAmount, todayTrend, weekTrend, monthTrend, pendingCount, sparklineData } = useMemo(() => {
    if (!payments || payments.length === 0) {
      return { 
        todayTotal: 0, 
        weekTotal: 0, 
        monthTotal: 0, 
        pendingAmount: 0,
        todayTrend: { value: 0, direction: 'neutral' as const },
        weekTrend: { value: 0, direction: 'neutral' as const },
        monthTrend: { value: 0, direction: 'neutral' as const },
        pendingCount: 0,
        sparklineData: {
          today: [0, 0, 0, 0, 0, 0, 0],
          week: [0, 0, 0, 0, 0, 0, 0],
          month: [0, 0, 0, 0, 0, 0, 0],
          pending: [0, 0, 0, 0, 0, 0, 0]
        }
      };
    }
    
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    
    let todaySum = 0;
    let yesterdaySum = 0;
    let weekSum = 0;
    let lastWeekSum = 0;
    let monthSum = 0;
    let lastMonthSum = 0;
    let pendingSum = 0;
    let pendingCount = 0;
    
    payments.forEach(payment => {
      const paymentDate = new Date(payment.processedAt);
      
      if (payment.status === 'pending') {
        pendingSum += payment.amount;
        pendingCount++;
      } else if (payment.status === 'completed') {
        // Today's revenue
        if (paymentDate >= today) {
          todaySum += payment.amount;
        }
        // Yesterday's revenue (for comparison)
        if (paymentDate >= yesterday && paymentDate < today) {
          yesterdaySum += payment.amount;
        }
        // This week's revenue
        if (paymentDate >= weekAgo) {
          weekSum += payment.amount;
        }
        // Last week's revenue (for comparison)
        if (paymentDate >= twoWeeksAgo && paymentDate < weekAgo) {
          lastWeekSum += payment.amount;
        }
        // This month's revenue
        if (paymentDate >= monthAgo) {
          monthSum += payment.amount;
        }
        // Last month's revenue (for comparison)
        if (paymentDate >= twoMonthsAgo && paymentDate < monthAgo) {
          lastMonthSum += payment.amount;
        }
      }
    });
    
    // Calculate trend percentages
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return { 
          value: current > 0 ? 100 : 0, 
          direction: current > 0 ? 'up' : 'neutral' as const 
        };
      }
      const percentChange = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(percentChange),
        direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral' as const
      };
    };
    
    // Generate sparkline data (last 7 days of revenue)
    const generateSparklineData = () => {
      const todaySparkline: number[] = [];
      const weekSparkline: number[] = [];
      const monthSparkline: number[] = [];
      const pendingSparkline: number[] = [];
      
      // Generate data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        let dayTotal = 0;
        let dayPending = 0;
        
        payments.forEach(payment => {
          const paymentDate = new Date(payment.processedAt);
          if (paymentDate >= date && paymentDate < nextDate) {
            if (payment.status === 'completed') {
              dayTotal += payment.amount;
            } else if (payment.status === 'pending') {
              dayPending += payment.amount;
            }
          }
        });
        
        todaySparkline.push(dayTotal);
        pendingSparkline.push(dayPending);
      }
      
      // Week sparkline: last 7 weeks
      for (let i = 6; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        let weeklyTotal = 0;
        payments.forEach(payment => {
          const paymentDate = new Date(payment.processedAt);
          if (paymentDate >= weekStart && paymentDate < weekEnd && payment.status === 'completed') {
            weeklyTotal += payment.amount;
          }
        });
        
        weekSparkline.push(weeklyTotal);
      }
      
      // Month sparkline: last 7 months
      for (let i = 6; i >= 0; i--) {
        const monthStart = new Date(today);
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        
        let monthlyTotal = 0;
        payments.forEach(payment => {
          const paymentDate = new Date(payment.processedAt);
          if (paymentDate >= monthStart && paymentDate < monthEnd && payment.status === 'completed') {
            monthlyTotal += payment.amount;
          }
        });
        
        monthSparkline.push(monthlyTotal);
      }
      
      return {
        today: todaySparkline,
        week: weekSparkline,
        month: monthSparkline,
        pending: pendingSparkline
      };
    };
    
    return {
      todayTotal: todaySum,
      weekTotal: weekSum,
      monthTotal: monthSum,
      pendingAmount: pendingSum,
      todayTrend: calculateTrend(todaySum, yesterdaySum),
      weekTrend: calculateTrend(weekSum, lastWeekSum),
      monthTrend: calculateTrend(monthSum, lastMonthSum),
      pendingCount: pendingCount,
      sparklineData: generateSparklineData()
    };
  }, [payments]);

  // Format currency with commas
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Enhanced payment columns with better formatting
  const paymentColumns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }: any) => (
        <div className="font-medium text-sm">{row.original.invoiceNumber}</div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }: any) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium hover:underline"
          onClick={() => {}}
        >
          {row.original.customerName}
        </Button>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => {
        const type = row.original.type || "booking";
        const typeConfig = {
          booking: { label: "Booking", color: "text-blue-600 bg-blue-50" },
          product: { label: "Product", color: "text-purple-600 bg-purple-50" },
          tip: { label: "Tip", color: "text-green-600 bg-green-50" }
        };
        const config = typeConfig[type as keyof typeof typeConfig];
        return (
          <Badge variant="secondary" className={cn("text-xs", config.color, "border-0")}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }: any) => {
        return (
          <div className="text-right font-semibold text-sm">
            ${row.original.amount.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }: any) => {
        const method = row.original.method;
        const MethodIcon = method === "cash" ? Banknote : CardIcon;
        const methodLabels: Record<string, string> = {
          "cash": "Cash",
          "card-tyro": "Card",
        };
        return (
          <div className="flex items-center gap-2">
            <MethodIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{methodLabels[method] || method}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status as Payment['status'];
        const statusConfig: Record<Payment['status'], { 
          icon: typeof CheckCircle; 
          label: string;
          color: string; 
          bg: string 
        }> = {
          completed: { 
            icon: CheckCircle, 
            label: "Completed",
            color: "text-green-700", 
            bg: "bg-green-50 border-green-200" 
          },
          pending: { 
            icon: Clock, 
            label: "Pending",
            color: "text-yellow-700", 
            bg: "bg-yellow-50 border-yellow-200" 
          },
          failed: { 
            icon: XCircle, 
            label: "Failed",
            color: "text-red-700", 
            bg: "bg-red-50 border-red-200" 
          },
          refunded: { 
            icon: RotateCcw, 
            label: "Refunded",
            color: "text-gray-700", 
            bg: "bg-gray-50 border-gray-200" 
          },
        };
        const config = statusConfig[status] || statusConfig.completed;
        const Icon = config.icon;
        
        return (
          <Badge 
            variant="secondary" 
            className={cn(
              "font-medium text-xs px-2.5 py-0.5 border",
              config.bg, 
              config.color
            )}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "processedAt",
      header: "Date",
      cell: ({ row }: any) => {
        const date = new Date(row.original.processedAt);
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
            <div className="text-xs">{date.toLocaleTimeString()}</div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: any) => {
        const payment = row.original;
        
        return (
          <div className="flex items-center justify-end gap-2">
            {payment.status === "completed" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSelectedPayment(payment);
                  setIsPinDialogOpen(true);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handlePrintInvoice(payment)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Invoice
                </DropdownMenuItem>
                {payment.status === "completed" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setIsPinDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Process Refund
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Filter payments based on all criteria
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = payment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           payment.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
      
      // Date range filtering
      const paymentDate = new Date(payment.processedAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let matchesDate = true;
      if (dateRange === "today") {
        matchesDate = paymentDate >= today;
      } else if (dateRange === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        matchesDate = paymentDate >= yesterday && paymentDate < today;
      } else if (dateRange === "last7days") {
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        matchesDate = paymentDate >= week;
      } else if (dateRange === "last30days") {
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        matchesDate = paymentDate >= month;
      }
      
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [payments, searchQuery, statusFilter, methodFilter, dateRange]);

  // Enhanced refund dialog
  const RefundDialog = () => (
    <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Issue a refund for {selectedPayment?.customerName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Invoice Number</span>
              <span className="font-medium">{selectedPayment?.invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Original Amount</span>
              <span className="text-2xl font-bold">${selectedPayment?.amount.toFixed(2)}</span>
            </div>
          </div>
          <Separator />
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="refund-amount"
                  type="number"
                  defaultValue={selectedPayment?.amount}
                  max={selectedPayment?.amount}
                  step="0.01"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-reason">Reason for Refund</Label>
              <Select defaultValue="customer-request">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer-request">Customer Request</SelectItem>
                  <SelectItem value="service-issue">Service Issue</SelectItem>
                  <SelectItem value="duplicate-payment">Duplicate Payment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-notes">Additional Notes</Label>
              <Input
                id="refund-notes"
                placeholder="Optional notes about this refund..."
              />
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Manager Authorization Required</p>
              <p className="text-yellow-700 mt-1">
                This action requires PIN authorization from a manager or owner.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={async () => {
              setIsLoading(true);
              try {
                // Process the refund with verified staff info
                
                // TODO: Call actual refund API endpoint here
                // await apiClient.processRefund(selectedPayment.id, refundAmount, verifiedStaff.id);
                
                // Simulate success
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                toast({
                  title: "Refund Processed",
                  description: `Refund of ${formatCurrency(selectedPayment?.amount || 0)} processed successfully`,
                });
                
                setIsRefundDialogOpen(false);
                setVerifiedStaff(null);
              } catch (error) {
                toast({
                  title: "Refund Failed",
                  description: "Unable to process refund. Please try again.",
                  variant: "destructive",
                });
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading || !verifiedStaff}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Process Refund
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Print invoice handler
  const handlePrintInvoice = async (payment: Payment) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      toast({
        title: "Unable to open print preview",
        description: "Please check your popup blocker settings",
        variant: "destructive",
      });
      return;
    }

    // Create the invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${payment.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #000;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 32px; margin: 0 0 10px 0; }
            h2 { font-size: 24px; margin: 0 0 10px 0; }
            h3 { font-size: 18px; margin: 0 0 10px 0; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header-flex { display: flex; justify-content: space-between; }
            .bill-to { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 10px; text-align: left; }
            th { border-bottom: 2px solid #000; font-weight: bold; }
            td { border-bottom: 1px solid #ddd; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .totals-box { width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .totals-final { border-top: 2px solid #000; padding-top: 10px; font-size: 20px; font-weight: bold; }
            .payment-info { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .footer { text-align: center; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
            @media print {
              body { margin: 0; }
              .invoice-container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <h1>INVOICE</h1>
              <div class="header-flex">
                <div>
                  <h2>${merchantProfile?.name || merchant?.name || 'Business Name'}</h2>
                  ${primaryLocation ? `
                    <p>${primaryLocation.address}</p>
                    <p>${primaryLocation.city}, ${primaryLocation.state} ${primaryLocation.zipCode}</p>
                  ` : ''}
                  ${merchantProfile?.phone ? `<p>Phone: ${merchantProfile.phone}</p>` : ''}
                  ${merchantProfile?.email ? `<p>Email: ${merchantProfile.email}</p>` : ''}
                  ${merchantProfile?.abn ? `<p>ABN: ${merchantProfile.abn}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <p style="font-size: 18px; font-weight: bold;">Invoice #${payment.invoiceNumber}</p>
                  <p>Date: ${new Date(payment.processedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div class="bill-to">
              <h3>Bill To:</h3>
              <p style="font-weight: bold;">${payment.customerName}</p>
              ${payment.customerPhone ? `<p>Phone: ${payment.customerPhone}</p>` : ''}
              ${payment.customerEmail ? `<p>Email: ${payment.customerEmail}</p>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${payment.order?.items?.length > 0 ? 
                  payment.order.items.map((item: any) => `
                    <tr>
                      <td>${item.name || item.serviceName || 'Service'}</td>
                      <td class="text-center">${item.quantity || 1}</td>
                      <td class="text-right">$${(item.price || 0).toFixed(2)}</td>
                      <td class="text-right">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  `).join('') :
                  `<tr>
                    <td>${payment.serviceName || payment.order?.booking?.services?.[0]?.service?.name || 'Service'}</td>
                    <td class="text-center">1</td>
                    <td class="text-right">$${payment.amount.toFixed(2)}</td>
                    <td class="text-right">$${payment.amount.toFixed(2)}</td>
                  </tr>`
                }
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-box">
                ${(() => {
                  const items = payment.order?.items || [];
                  const subtotal = items.length > 0 ? 
                    items.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0) :
                    payment.amount;
                  const discount = payment.order?.totalDiscount || payment.order?.discount || 0;
                  const surcharge = payment.order?.totalSurcharge || payment.order?.surcharge || 0;
                  const tax = payment.order?.totalTax || payment.order?.tax || 0;
                  
                  let html = '';
                  
                  // Show subtotal if there's a discount, surcharge, or tax
                  if (discount > 0 || surcharge > 0 || tax > 0) {
                    html += `
                      <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  
                  if (discount > 0) {
                    html += `
                      <div class="totals-row" style="color: green;">
                        <span>Discount:</span>
                        <span>-$${discount.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  
                  if (surcharge > 0) {
                    html += `
                      <div class="totals-row">
                        <span>Surcharge:</span>
                        <span>$${surcharge.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  
                  if (tax > 0) {
                    html += `
                      <div class="totals-row">
                        <span>Tax:</span>
                        <span>$${tax.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  
                  html += `
                    <div class="totals-row totals-final">
                      <span>Total:</span>
                      <span>$${payment.amount.toFixed(2)}</span>
                    </div>
                  `;
                  
                  return html;
                })()}
              </div>
            </div>

            <div class="payment-info">
              <h3>Payment Information</h3>
              <div class="totals-row">
                <span>Payment Method:</span>
                <span>${payment.method === 'cash' ? 'Cash' : 'Credit Card'}</span>
              </div>
              <div class="totals-row">
                <span>Payment Status:</span>
                <span style="font-weight: bold; color: ${payment.status === 'completed' ? 'green' : '#000'};">
                  ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
              </div>
              <div class="totals-row">
                <span>Transaction Date:</span>
                <span>${new Date(payment.processedAt).toLocaleString()}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your business!</p>
              ${merchantProfile?.website ? `<p>Visit us at: ${merchantProfile.website}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    // Write the HTML to the new window
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing (user can cancel if needed)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 250);
    };
  };

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <CreditCard className="h-6 w-6 text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No transactions found</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        No payments match your current filters. Try adjusting your search criteria or date range.
      </p>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">
            Monitor transactions and financial performance
          </p>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatCard
          title="Today's Revenue"
          value={formatCurrency(todayTotal)}
          trend={todayTrend.direction}
          trendValue={`${todayTrend.value.toFixed(1)}% from yesterday`}
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          sparklineData={sparklineData.today}
          accentColor="primary"
        />
        <EnhancedStatCard
          title="This Week"
          value={formatCurrency(weekTotal)}
          trend={weekTrend.direction}
          trendValue={`${weekTrend.value.toFixed(1)}% from last week`}
          icon={<Calendar className="h-5 w-5 text-green-600" />}
          sparklineData={sparklineData.week}
          accentColor="success"
        />
        <EnhancedStatCard
          title="This Month"
          value={formatCurrency(monthTotal)}
          trend={monthTrend.direction}
          trendValue={`${monthTrend.value.toFixed(1)}% from last month`}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          sparklineData={sparklineData.month}
          accentColor="primary"
        />
        <EnhancedStatCard
          title="Pending"
          value={formatCurrency(pendingAmount)}
          trend={pendingCount > 0 ? "down" : "neutral"}
          trendValue={`${pendingCount} transaction${pendingCount !== 1 ? 's' : ''}`}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          sparklineData={sparklineData.pending}
          accentColor="warning"
        />
      </div>

      {/* Transactions Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                {filteredPayments.length} transactions found
              </CardDescription>
            </div>
            {selectedPayments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedPayments.length} selected
                </span>
                <Button size="sm" variant="outline">
                  Bulk Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enhanced Filter Bar */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[160px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      {(statusFilter !== "all" || methodFilter !== "all") && (
                        <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                          {[statusFilter !== "all", methodFilter !== "all"].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-2 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Payment Method</Label>
                        <Select value={methodFilter} onValueChange={setMethodFilter}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card-tyro">Card (Tyro)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(statusFilter !== "all" || methodFilter !== "all") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setStatusFilter("all");
                            setMethodFilter("all");
                          }}
                          className="text-sm"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Clear filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Table with loading state */}
          <AnimatePresence mode="wait">
            {isLoadingPayments ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </motion.div>
            ) : filteredPayments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <EmptyState />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DataTable
                  columns={paymentColumns}
                  data={filteredPayments}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <RefundDialog />
      
      <PinVerificationDialog
        open={isPinDialogOpen}
        onOpenChange={setIsPinDialogOpen}
        action="refund_payment"
        actionDescription="Enter your PIN to authorize this refund"
        onVerify={async (pin) => {
          try {
            // TODO: Implement PIN verification with proper API client
            // const result = await authClient.verifyPin(pin, 'refund_payment');
            return {
              success: false,
              error: 'PIN verification not yet implemented',
            };
          } catch (error: any) {
            return {
              success: false,
              error: error.response?.data?.message || 'Invalid PIN',
            };
          }
        }}
        onSuccess={(staff) => {
          setVerifiedStaff(staff);
          setIsPinDialogOpen(false);
          setIsRefundDialogOpen(true);
        }}
        onCancel={() => {
          setSelectedPayment(null);
        }}
      />
    </div>
    </ErrorBoundary>
  );
}