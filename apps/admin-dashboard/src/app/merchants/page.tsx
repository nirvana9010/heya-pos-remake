"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreVertical, Edit, Eye, Building2, DollarSign, Users, AlertCircle, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { DataTable } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@heya-pos/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Alert, AlertDescription, AlertTitle } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { adminApi, type Merchant, type Package } from "@/lib/admin-api";
import { ProtectedRoute } from "@/components/protected-route";

function MerchantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [createdMerchantInfo, setCreatedMerchantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subdomain: '',
    username: '',
    password: '',
    packageId: '',
    abn: ''
  });
  const [checkingAvailability, setCheckingAvailability] = useState({
    subdomain: false,
    username: false
  });
  const [availability, setAvailability] = useState({
    subdomain: true,
    username: true
  });

  const merchantColumns = [
    {
      accessorKey: "name",
      header: "Merchant",
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{row.original.subdomain}</p>
        </div>
      ),
    },
    {
      accessorKey: "subscription",
      header: "Plan",
      cell: ({ row }: any) => {
        const subscription = row.original.subscription;
        if (!subscription) return <Badge variant="outline">No Plan</Badge>;
        const plan = subscription.package.name.toLowerCase();
        const variant = plan === "enterprise" ? "default" : plan === "premium" ? "secondary" : "outline";
        return <Badge variant={variant}>{subscription.package.name}</Badge>;
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }: any) => {
        const isActive = row.original.isActive;
        return (
          <Badge className={`${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} border-0`}>
            {isActive ? 'Active' : 'Inactive'}
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
              Suspend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [merchantsData, packagesData] = await Promise.all([
        adminApi.getMerchants(),
        adminApi.getPackages()
      ]);
      setMerchants(merchantsData);
      setPackages(packagesData);
      // Set default package if available
      if (packagesData.length > 0) {
        setFormData(prev => ({ ...prev, packageId: packagesData[0].id }));
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain) return;
    
    setCheckingAvailability(prev => ({ ...prev, subdomain: true }));
    try {
      const result = await adminApi.checkSubdomainAvailability(subdomain);
      setAvailability(prev => ({ ...prev, subdomain: result.available }));
    } catch (error) {
      console.error('Failed to check subdomain:', error);
    } finally {
      setCheckingAvailability(prev => ({ ...prev, subdomain: false }));
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username) return;
    
    setCheckingAvailability(prev => ({ ...prev, username: true }));
    try {
      const result = await adminApi.checkUsernameAvailability(username);
      setAvailability(prev => ({ ...prev, username: result.available }));
    } catch (error) {
      console.error('Failed to check username:', error);
    } finally {
      setCheckingAvailability(prev => ({ ...prev, username: false }));
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleCreateMerchant = async () => {
    // Validate form
    if (!formData.name || !formData.email || !formData.phone || !formData.subdomain || 
        !formData.username || !formData.password || !formData.packageId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check availability
    if (!availability.subdomain || !availability.username) {
      toast({
        title: "Validation Error",
        description: "Subdomain or username is not available",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const merchant = await adminApi.createMerchant(formData);
      
      // Prepare success info
      setCreatedMerchantInfo({
        merchantName: merchant.name,
        bookingUrl: `https://bookings.heya-pos.com/${merchant.subdomain}`,
        merchantUrl: `https://merchant.heya-pos.com`,
        username: formData.username,
        password: formData.password
      });
      
      setIsAddDialogOpen(false);
      setIsSuccessDialogOpen(true);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Failed to create merchant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create merchant",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSuspendMerchant = async () => {
    if (!selectedMerchant) return;
    
    try {
      await adminApi.updateMerchant(selectedMerchant.id, { isActive: false });
      toast({
        title: "Success",
        description: "Merchant suspended successfully",
      });
      setIsSuspendDialogOpen(false);
      setSelectedMerchant(null);
      await loadData();
    } catch (error: any) {
      console.error('Failed to suspend merchant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to suspend merchant",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      subdomain: '',
      username: '',
      password: '',
      packageId: packages.length > 0 ? packages[0].id : '',
      abn: ''
    });
    setAvailability({ subdomain: true, username: true });
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         merchant.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && merchant.isActive) ||
                         (statusFilter === "inactive" && !merchant.isActive);
    return matchesSearch && matchesStatus;
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
              <Label htmlFor="business-name">Business Name *</Label>
              <Input 
                id="business-name" 
                placeholder="e.g., Hamilton Beauty" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="relative">
                <Input 
                  id="subdomain" 
                  placeholder="hamilton-beauty" 
                  value={formData.subdomain}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setFormData({ ...formData, subdomain: value });
                  }}
                  onBlur={() => checkSubdomainAvailability(formData.subdomain)}
                  className={!availability.subdomain ? 'border-red-500' : ''}
                  required
                />
                {checkingAvailability.subdomain && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
              </div>
              {!availability.subdomain && (
                <p className="text-sm text-red-500">Subdomain is not available</p>
              )}
              <p className="text-xs text-muted-foreground">https://bookings.heya-pos.com/{formData.subdomain || 'subdomain'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="contact@business.com.au" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input 
                id="phone" 
                placeholder="(02) 9876 5432" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <Input 
                  id="username" 
                  placeholder="HAMILTON" 
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setFormData({ ...formData, username: value });
                  }}
                  onBlur={() => checkUsernameAvailability(formData.username)}
                  className={!availability.username ? 'border-red-500' : ''}
                  required
                />
                {checkingAvailability.username && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
              </div>
              {!availability.username && (
                <p className="text-sm text-red-500">Username is not available</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="flex gap-2">
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Min. 8 characters" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan *</Label>
              <Select 
                value={formData.packageId} 
                onValueChange={(value) => setFormData({ ...formData, packageId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} (${pkg.monthlyPrice}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="abn">ABN (Optional)</Label>
              <Input 
                id="abn" 
                placeholder="12 345 678 901" 
                value={formData.abn}
                onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setIsAddDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button onClick={handleCreateMerchant} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Merchant'
            )}
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
                  {loading ? '-' : merchants.filter(m => m.isActive).length}
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
                  {loading ? '-' : merchants.filter(m => !m.isActive).length}
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
                  {loading ? '-' : `$${merchants.reduce((sum, m) => sum + (m.subscription?.package.monthlyPrice || 0), 0).toLocaleString()}`}
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
              Are you sure you want to suspend {selectedMerchant?.name}? This will prevent them from accessing the platform.
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

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Merchant Created Successfully!</DialogTitle>
            <DialogDescription>
              {createdMerchantInfo?.merchantName} has been created. Share these credentials with the merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Save these credentials securely. The password cannot be retrieved later.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Booking URL</p>
                  <p className="text-sm text-muted-foreground">{createdMerchantInfo?.bookingUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(createdMerchantInfo?.bookingUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(createdMerchantInfo?.bookingUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Merchant Portal</p>
                  <p className="text-sm text-muted-foreground">{createdMerchantInfo?.merchantUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(createdMerchantInfo?.merchantUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(createdMerchantInfo?.merchantUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Username</p>
                  <p className="text-sm text-muted-foreground font-mono">{createdMerchantInfo?.username}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(createdMerchantInfo?.username)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-sm text-muted-foreground font-mono">{createdMerchantInfo?.password}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(createdMerchantInfo?.password)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuccessDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MerchantsPageWrapper() {
  return (
    <ProtectedRoute>
      <MerchantsPage />
    </ProtectedRoute>
  );
}