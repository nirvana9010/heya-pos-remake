"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Building2, DollarSign, Users, AlertCircle } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { DataTable } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@heya-pos/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Alert, AlertDescription, AlertTitle } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { mockApi, type Merchant } from "@heya-pos/shared";


  const merchantColumns = [
    {
      accessorKey: "businessName",
      header: "Merchant",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.businessName}</p>
          <p className="text-sm text-muted-foreground">{row.original.merchantCode}</p>
        </div>
      ),
    },
    {
      accessorKey: "subscriptionPlan",
      header: "Plan",
      cell: ({ row }: any) => {
        const plan = row.original.subscriptionPlan || 'basic';
        const variant = plan === "enterprise" ? "default" : plan === "premium" ? "secondary" : "outline";
        return <Badge variant={variant}>{plan}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status;
        const statusColors = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-gray-100 text-gray-800",
          suspended: "bg-red-100 text-red-800",
        };
        return (
          <Badge className={`${statusColors[status as keyof typeof statusColors]} border-0`}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString(),
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
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Edit merchant:', row.original.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => {
                setSelectedMerchant(row.original);
                setIsSuspendDialogOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Suspend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

export default function MerchantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    merchantCode: ''
  });

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getMerchants();
      setMerchants(data);
    } catch (error) {
      console.error('Failed to load merchants:', error);
      toast({
        title: "Error",
        description: "Failed to load merchants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMerchant = async () => {
    try {
      // In a real app, this would create a new merchant
      console.log('Creating merchant:', formData);
      toast({
        title: "Success",
        description: "Merchant created successfully",
      });
      setIsAddDialogOpen(false);
      resetForm();
      await loadMerchants();
    } catch (error) {
      console.error('Failed to create merchant:', error);
      toast({
        title: "Error",
        description: "Failed to create merchant",
        variant: "destructive",
      });
    }
  };

  const handleSuspendMerchant = async () => {
    if (!selectedMerchant) return;
    
    try {
      await mockApi.updateMerchant(selectedMerchant.id, { status: 'suspended' });
      toast({
        title: "Success",
        description: "Merchant suspended successfully",
      });
      setIsSuspendDialogOpen(false);
      setSelectedMerchant(null);
      await loadMerchants();
    } catch (error) {
      console.error('Failed to suspend merchant:', error);
      toast({
        title: "Error",
        description: "Failed to suspend merchant",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      businessName: '',
      email: '',
      phone: '',
      address: '',
      merchantCode: ''
    });
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         merchant.merchantCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter;
    const matchesPlan = planFilter === "all" || (merchant.subscriptionPlan || 'basic') === planFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const AddMerchantDialog = () => (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Merchant</DialogTitle>
          <DialogDescription>
            Create a new merchant account on the platform
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input 
                id="business-name" 
                placeholder="e.g., Hamilton Beauty" 
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchant-code">Merchant Code</Label>
              <Input 
                id="merchant-code" 
                placeholder="HAMILTON" 
                value={formData.merchantCode}
                onChange={(e) => setFormData({ ...formData, merchantCode: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="contact@business.com.au" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                placeholder="(02) 9876 5432" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Business Address</Label>
            <Input 
              id="address" 
              placeholder="123 Main St, Sydney NSW 2000" 
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select defaultValue="basic">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic ($99/mo)</SelectItem>
                <SelectItem value="premium">Premium ($199/mo)</SelectItem>
                <SelectItem value="enterprise">Enterprise ($399/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateMerchant}>
            Create Merchant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Merchants</h1>
          <p className="text-muted-foreground mt-1">Manage all merchant accounts on the platform</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Merchant
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Merchants</p>
                <p className="text-2xl font-bold">{loading ? '-' : merchants.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {loading ? '-' : merchants.filter(m => m.status === "active").length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">
                  {loading ? '-' : merchants.filter(m => m.status === "inactive").length}
                </p>
              </div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total MRR</p>
                <p className="text-2xl font-bold">
                  {loading ? '-' : `$${(merchants.length * 199).toLocaleString()}`}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Merchants</CardTitle>
          <CardDescription>View and manage merchant accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search merchants..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading merchants...</p>
              </div>
            </div>
          ) : (
            <DataTable
              columns={merchantColumns}
              data={filteredMerchants}
            />
          )}
        </CardContent>
      </Card>

      <AddMerchantDialog />

      {/* Suspend Confirmation Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Merchant</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {selectedMerchant?.businessName}? This will prevent them from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              All active bookings and services will be temporarily unavailable.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspendMerchant}>
              Suspend Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}