"use client";

import { useState } from "react";
import { Search, Download, CreditCard, DollarSign, TrendingUp, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { DataTable } from "@heya-pos/ui";
import { StatCard } from "@heya-pos/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { formatDate } from "@heya-pos/utils";

interface Payment {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  method: "cash" | "card-stripe" | "card-tyro";
  status: "completed" | "pending" | "failed" | "refunded";
  processedAt: Date;
}

const mockPayments: Payment[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-001",
    customerName: "Sarah Johnson",
    amount: 150.00,
    method: "card-stripe",
    status: "completed",
    processedAt: new Date("2024-01-26T10:30:00"),
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-002",
    customerName: "Michael Chen",
    amount: 75.00,
    method: "cash",
    status: "completed",
    processedAt: new Date("2024-01-26T11:45:00"),
  },
  {
    id: "3",
    invoiceNumber: "INV-2024-003",
    customerName: "Emily Brown",
    amount: 200.00,
    method: "card-stripe",
    status: "pending",
    processedAt: new Date("2024-01-26T14:15:00"),
  },
  {
    id: "4",
    invoiceNumber: "INV-2024-004",
    customerName: "David Wilson",
    amount: 90.00,
    method: "card-tyro",
    status: "refunded",
    processedAt: new Date("2024-01-25T16:00:00"),
  },
];

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const todayTotal = 425.00;
  const weekTotal = 2850.00;
  const monthTotal = 12500.00;
  const pendingAmount = 200.00;

  const paymentColumns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
    },
    {
      accessorKey: "customerName",
      header: "Customer",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => {
        return <span className="font-medium">${row.original.amount.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }: any) => {
        const method = row.original.method;
        const methodLabels: Record<string, string> = {
          "cash": "Cash",
          "card-stripe": "Card (Stripe)",
          "card-tyro": "Card (Tyro)",
        };
        return (
          <Badge variant="outline" className="capitalize">
            {methodLabels[method] || method}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status as Payment['status'];
        const statusConfig: Record<Payment['status'], { icon: typeof CheckCircle; color: string; bg: string }> = {
          completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          pending: { icon: RefreshCw, color: "text-yellow-600", bg: "bg-yellow-50" },
          failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          refunded: { icon: RefreshCw, color: "text-gray-600", bg: "bg-gray-50" },
        };
        const config = statusConfig[status] || statusConfig.completed;

        const Icon = config.icon;
        
        return (
          <Badge variant="secondary" className={`${config.bg} ${config.color} border-0`}>
            <Icon className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "processedAt",
      header: "Date",
      cell: ({ row }: any) => {
        return formatDate(row.original.processedAt);
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const payment = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (payment.status === "completed") {
                setSelectedPayment(payment);
                setIsRefundDialogOpen(true);
              }
            }}
            disabled={payment.status !== "completed"}
          >
            Refund
          </Button>
        );
      },
    },
  ];

  const filteredPayments = mockPayments.filter(payment => {
    const matchesSearch = payment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const RefundDialog = () => (
    <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Refund for {selectedPayment?.customerName} - {selectedPayment?.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Original Amount</Label>
            <div className="text-2xl font-semibold">${selectedPayment?.amount.toFixed(2)}</div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="refund-amount">Refund Amount</Label>
            <Input
              id="refund-amount"
              type="number"
              defaultValue={selectedPayment?.amount}
              max={selectedPayment?.amount}
              step="0.01"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="refund-reason">Reason for Refund</Label>
            <Input
              id="refund-reason"
              placeholder="Enter reason..."
            />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              This action requires PIN authorization from a manager or owner.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setIsRefundDialogOpen(false)}>
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage all payment transactions</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today"
          value={`$${todayTotal.toFixed(2)}`}
          description="+12% from yesterday"
          icon={<DollarSign className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="This Week"
          value={`$${weekTotal.toFixed(2)}`}
          description="+8% from last week"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="This Month"
          value={`$${monthTotal.toFixed(2)}`}
          description="+15% from last month"
          icon={<CreditCard className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Pending"
          value={`$${pendingAmount.toFixed(2)}`}
          description="2 transactions"
          icon={<RefreshCw className="h-4 w-4" />}
          trend="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>All payment transactions from your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by customer or invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card-stripe">Card (Stripe)</SelectItem>
                <SelectItem value="card-tyro">Card (Tyro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={paymentColumns}
            data={filteredPayments}
          />
        </CardContent>
      </Card>

      <RefundDialog />
    </div>
  );
}