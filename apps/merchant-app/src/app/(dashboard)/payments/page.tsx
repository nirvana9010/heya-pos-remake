"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/clients";
import { 
  Search, Download, CreditCard, RefreshCw, 
  CheckCircle, XCircle, Clock, RotateCcw, Banknote, Calendar,
  MoreVertical, FileText, Mail, Filter, ChevronDown, AlertCircle,
  DollarSign, CreditCard as CardIcon
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
import { useAuth, usePermissions } from "@/lib/auth/auth-provider";
import { useTyro } from "@/hooks/useTyro";
import { TyroTransactionResult } from "@/types/tyro";

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
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('customer-request');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { can } = usePermissions();
  const { refund: tyroRefund, isAvailable: isTyroAvailable, isPaired: isTyroPaired } = useTyro();
  
  
  // Fetch real payments data
  const { data: paymentsResponse, isLoading: isLoadingPayments, refetch, error } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await apiClient.getPayments();
      return response;
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

  // Location data would be fetched here if needed
  const primaryLocation = null;

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
      order: payment.order,
    }));
  }, [paymentsResponse]);


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
      id: "services",
      header: "Services",
      cell: ({ row }: any) => {
        const payment = row.original;
        const items = payment.order?.items || [];
        const bookingServices = payment.order?.booking?.services || [];
        
        if (items.length > 0) {
          const serviceNames = items.map((item: any) => 
            item.name || item.description || item.service?.name || 'Service'
          );
          return (
            <div className="text-sm">
              {serviceNames.length === 1 ? serviceNames[0] : 
                `${serviceNames[0]} +${serviceNames.length - 1} more`}
            </div>
          );
        } else if (bookingServices.length > 0) {
          const serviceNames = bookingServices.map((bs: any) => 
            bs.service?.name || 'Service'
          );
          return (
            <div className="text-sm">
              {serviceNames.length === 1 ? serviceNames[0] : 
                `${serviceNames[0]} +${serviceNames.length - 1} more`}
            </div>
          );
        }
        return <div className="text-sm">Service</div>;
      },
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }: any) => {
        const payment = row.original;
        
        // Determine type based on actual content
        let type = "service";
        let label = "Service";
        
        if (payment.order?.items?.length > 0) {
          // Check the itemType of the first item
          const firstItemType = payment.order.items[0]?.itemType;
          if (firstItemType === 'SERVICE') {
            type = "service";
            label = "Service";
          } else if (firstItemType === 'PRODUCT') {
            type = "product";
            label = "Product";
          } else if (firstItemType === 'TIP') {
            type = "tip";
            label = "Tip";
          }
        } else if (payment.order?.bookingId) {
          // Fallback to booking if no items but has bookingId
          type = "booking";
          label = "Booking";
        }
        
        const typeConfig = {
          booking: { color: "text-blue-600 bg-blue-50" },
          service: { color: "text-indigo-600 bg-indigo-50" },
          product: { color: "text-purple-600 bg-purple-50" },
          tip: { color: "text-green-600 bg-green-50" }
        };
        const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.service;
        
        return (
          <Badge variant="secondary" className={cn("text-xs", config.color, "border-0")}>
            {label}
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
            {payment.status === "completed" && can('payment.delete') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setSelectedPayment(payment);
                  setRefundAmount(payment.amount?.toString() || '');
                  setRefundReason('customer-request');
                  setRefundNotes('');
                  setIsRefundDialogOpen(true);
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
                {payment.status === "completed" && can('payment.delete') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setRefundAmount(payment.amount?.toString() || '');
                        setRefundReason('customer-request');
                        setRefundNotes('');
                        setIsRefundDialogOpen(true);
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

  // Process refund handler
  const handleProcessRefund = async () => {
    if (!selectedPayment) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid refund amount.",
        variant: "destructive",
      });
      return;
    }

    if (amount > selectedPayment.amount) {
      toast({
        title: "Invalid Amount",
        description: "Refund amount cannot exceed the original payment amount.",
        variant: "destructive",
      });
      return;
    }

    const reasonLabel = {
      'customer-request': 'Customer Request',
      'service-issue': 'Service Issue',
      'duplicate-payment': 'Duplicate Payment',
      'other': 'Other'
    }[refundReason] || refundReason;

    const fullReason = refundNotes
      ? `${reasonLabel}: ${refundNotes}`
      : reasonLabel;

    setIsLoading(true);

    try {
      // For Tyro card payments, process refund through the terminal first
      if (selectedPayment.method === 'card-tyro') {
        // Check if Tyro is available
        if (!isTyroAvailable()) {
          toast({
            title: "Tyro Not Available",
            description: "Tyro SDK is not loaded. Please refresh the page and try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (!isTyroPaired()) {
          toast({
            title: "Terminal Not Paired",
            description: "Please pair your Tyro terminal in Settings first.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Close dialog to avoid z-index conflicts with Tyro UI
        setIsRefundDialogOpen(false);

        // Process Tyro refund
        tyroRefund(amount, {
          transactionCompleteCallback: async (response) => {
            if (response.result === TyroTransactionResult.APPROVED) {
              // Tyro refund successful, now record in API
              try {
                await apiClient.refundPayment({
                  paymentId: selectedPayment.id,
                  amount: amount,
                  reason: fullReason,
                });

                toast({
                  title: "Refund Processed",
                  description: `Refund of ${formatCurrency(amount)} processed successfully`,
                });

                // Refresh payments list
                refetch();
              } catch (apiError: any) {
                // Tyro refund succeeded but API recording failed
                console.error('Failed to record refund in API:', apiError);
                toast({
                  title: "Refund Processed - Recording Failed",
                  description: `Refund of ${formatCurrency(amount)} was processed on the terminal but failed to record. Please contact support.`,
                  variant: "destructive",
                });
              }
            } else {
              // Refund failed or was cancelled
              setIsRefundDialogOpen(true); // Reopen dialog

              const errorMessage = response.result === TyroTransactionResult.CANCELLED
                ? 'Refund was cancelled'
                : response.result === TyroTransactionResult.DECLINED
                ? 'Refund was declined'
                : 'Refund failed';

              toast({
                title: "Refund Failed",
                description: errorMessage,
                variant: "destructive",
              });
            }

            setIsLoading(false);
            setVerifiedStaff(null);
          },
          receiptCallback: (receipt) => {
            console.log('Refund receipt received:', receipt);
          }
        });

        return; // Exit early for Tyro refunds
      }

      // For cash payments, just record the refund in the API
      await apiClient.refundPayment({
        paymentId: selectedPayment.id,
        amount: amount,
        reason: fullReason,
      });

      toast({
        title: "Refund Processed",
        description: `Refund of ${formatCurrency(amount)} recorded successfully`,
      });

      setIsRefundDialogOpen(false);
      setVerifiedStaff(null);

      // Refresh payments list
      refetch();
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "Refund Failed",
        description: error?.response?.data?.message || error?.message || "Unable to process refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced refund dialog
  const RefundDialog = () => (
    <Dialog open={isRefundDialogOpen} onOpenChange={(open) => {
      if (!isLoading) {
        setIsRefundDialogOpen(open);
        if (!open) {
          setVerifiedStaff(null);
        }
      }
    }}>
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
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="font-medium">
                {selectedPayment?.method === 'card-tyro' ? 'Card (Tyro)' : 'Cash'}
              </span>
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
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={selectedPayment?.amount}
                  step="0.01"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-reason">Reason for Refund</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
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
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Optional notes about this refund..."
              />
            </div>
          </div>
          {selectedPayment?.method === 'card-tyro' && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Tyro Terminal Refund</p>
                <p className="text-blue-700 mt-1">
                  This refund will be processed through your Tyro terminal.
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleProcessRefund}
            disabled={isLoading || !refundAmount || parseFloat(refundAmount) <= 0}
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
    try {
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

      // Safely get values with defaults
      const businessName = merchantProfile?.name || merchant?.name || 'Business Name';
      const invoiceNumber = payment.invoiceNumber || 'N/A';
      const customerName = payment.customerName || 'Customer';
      const processedDate = payment.processedAt ? new Date(payment.processedAt).toLocaleDateString() : 'N/A';
      const processedDateTime = payment.processedAt ? new Date(payment.processedAt).toLocaleString() : 'N/A';

      // Create the invoice HTML
      const invoiceHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoiceNumber}</title>
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
                  <h2>${businessName}</h2>
                  ${primaryLocation ? `
                    <p>${primaryLocation.address || ''}</p>
                    <p>${primaryLocation.city || ''}, ${primaryLocation.state || ''} ${primaryLocation.zipCode || ''}</p>
                  ` : ''}
                  ${merchantProfile?.phone ? `<p>Phone: ${merchantProfile.phone}</p>` : ''}
                  ${merchantProfile?.email ? `<p>Email: ${merchantProfile.email}</p>` : ''}
                  ${merchantProfile?.abn ? `<p>ABN: ${merchantProfile.abn}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <p style="font-size: 18px; font-weight: bold;">Invoice #${invoiceNumber}</p>
                  <p>Date: ${processedDate}</p>
                </div>
              </div>
            </div>

            <div class="bill-to">
              <h3>Bill To:</h3>
              <p style="font-weight: bold;">${customerName}</p>
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
                ${(() => {
                  // Order items are the source of truth
                  const orderItems = payment.order?.items || [];
                  
                  if (orderItems.length > 0) {
                    // Display all order items
                    return orderItems.map((item: any) => {
                      const itemName = item.name || item.description || item.service?.name || 'Service';
                      const unitPrice = parseFloat(item.unitPrice || item.price || 0);
                      const quantity = item.quantity || 1;
                      const total = unitPrice * quantity;
                      
                      return `
                        <tr>
                          <td>${itemName}</td>
                          <td class="text-center">${quantity}</td>
                          <td class="text-right">$${unitPrice.toFixed(2)}</td>
                          <td class="text-right">$${total.toFixed(2)}</td>
                        </tr>
                      `;
                    }).join('');
                  } else if (payment.order?.booking?.services?.length > 0) {
                    // Fallback to booking services if no order items
                    return payment.order.booking.services.map((bookingService: any) => {
                      const serviceName = bookingService.service?.name || 'Service';
                      const price = parseFloat(bookingService.price || bookingService.service?.price || 0);
                      
                      return `
                        <tr>
                          <td>${serviceName}</td>
                          <td class="text-center">1</td>
                          <td class="text-right">$${price.toFixed(2)}</td>
                          <td class="text-right">$${price.toFixed(2)}</td>
                        </tr>
                      `;
                    }).join('');
                  } else {
                    // Last resort: show generic entry
                    return `
                      <tr>
                        <td>Service</td>
                        <td class="text-center">1</td>
                        <td class="text-right">$${payment.amount.toFixed(2)}</td>
                        <td class="text-right">$${payment.amount.toFixed(2)}</td>
                      </tr>
                    `;
                  }
                })()}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-box">
                ${(() => {
                  const items = payment.order?.items || [];
                  const modifiers = payment.order?.modifiers || [];
                  
                  // Calculate subtotal from items
                  let subtotal = 0;
                  if (items.length > 0) {
                    subtotal = items.reduce((sum: number, item: any) => {
                      const price = parseFloat(item.unitPrice || item.price || 0);
                      const quantity = item.quantity || 1;
                      return sum + (price * quantity);
                    }, 0);
                  } else {
                    // If no items, use the payment amount as base
                    subtotal = payment.amount;
                  }
                  
                  let html = '';
                  
                  // Check if we have any modifiers or if we should show subtotal
                  const hasModifiers = modifiers.length > 0;
                  const orderSubtotal = parseFloat(payment.order?.subtotal || subtotal);
                  const orderTax = parseFloat(payment.order?.taxAmount || 0);
                  
                  // Always show subtotal if there are modifiers or tax
                  if (hasModifiers || orderTax > 0) {
                    html += `
                      <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>$${orderSubtotal.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  
                  // Display each modifier (with order-level modifiers last)
                  if (hasModifiers) {
                    // Sort modifiers: item-level first, then order-level
                    const sortedModifiers = [...modifiers].sort((a: any, b: any) => {
                      const aIsOrderLevel = !a.appliesTo || a.appliesTo.length === 0;
                      const bIsOrderLevel = !b.appliesTo || b.appliesTo.length === 0;
                      
                      // Order-level modifiers should appear last
                      if (aIsOrderLevel && !bIsOrderLevel) return 1;
                      if (!aIsOrderLevel && bIsOrderLevel) return -1;
                      return 0;
                    });
                    
                    sortedModifiers.forEach((modifier: any) => {
                      const amount = parseFloat(modifier.amount || 0);
                      const isDiscount = modifier.type === 'DISCOUNT';
                      
                      html += `
                        <div class="totals-row" style="${isDiscount ? 'color: green;' : ''}">
                          <span>${modifier.description || (isDiscount ? 'Discount' : 'Adjustment')}:</span>
                          <span>${isDiscount ? '-$' : '$'}${Math.abs(amount).toFixed(2)}</span>
                        </div>
                      `;
                    });
                  }
                  
                  // Show tax if present
                  if (orderTax > 0) {
                    html += `
                      <div class="totals-row">
                        <span>Tax:</span>
                        <span>$${orderTax.toFixed(2)}</span>
                      </div>
                    `;
                  }
                  
                  // Always show total
                  const totalAmount = parseFloat(payment.order?.totalAmount || payment.amount);
                  html += `
                    <div class="totals-row totals-final">
                      <span>Total:</span>
                      <span>$${totalAmount.toFixed(2)}</span>
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
                <span>${processedDateTime}</span>
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
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Failed to generate invoice",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
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
                  showColumnVisibility={true}
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
          // Reset refund form state
          setRefundAmount(selectedPayment?.amount?.toString() || '');
          setRefundReason('customer-request');
          setRefundNotes('');
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