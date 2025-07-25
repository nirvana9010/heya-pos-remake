"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreVertical, Edit, Eye, Building2, DollarSign, Users, AlertCircle, Copy, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { DataTable } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@heya-pos/ui";
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subdomain: '',
    password: '',
    packageId: '',
    abn: ''
  });
  const [checkingAvailability, setCheckingAvailability] = useState({
    subdomain: false
  });
  const [availability, setAvailability] = useState({
    subdomain: true
  });

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
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load merchants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) return;
    
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

  const generateSubdomain = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const generateUsername = (name: string) => {
    // Auto-generate username from merchant name
    // Remove special characters and spaces, convert to uppercase
    return name.toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .substring(0, 20);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    // Auto-generate subdomain if not manually edited
    if (!formData.subdomain || formData.subdomain === generateSubdomain(formData.name)) {
      const subdomain = generateSubdomain(name);
      setFormData(prev => ({ ...prev, subdomain }));
      checkSubdomainAvailability(subdomain);
    }
  };

  const handleSubdomainChange = (subdomain: string) => {
    const cleaned = subdomain.toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, subdomain: cleaned }));
    checkSubdomainAvailability(cleaned);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      subdomain: '',
      password: '',
      packageId: '',
      abn: ''
    });
    setAvailability({
      subdomain: true
    });
    setShowCreateForm(false);
  };

  const handleCreateMerchant = async () => {
    // Validate form
    if (!formData.name || !formData.email || !formData.phone || !formData.subdomain || 
        !formData.password || !formData.packageId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check availability
    if (!availability.subdomain) {
      toast({
        title: "Validation Error",
        description: "Subdomain is not available",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      
      // Auto-generate username from merchant name
      const username = generateUsername(formData.name);
      
      const merchant = await adminApi.createMerchant({
        ...formData,
        username
      });
      
      toast({
        title: "Success!",
        description: `Merchant "${merchant.name}" created successfully`,
      });

      // Show credentials in an alert
      const message = `
Merchant created successfully!

Booking URL: https://bookings.heya-pos.com/${merchant.subdomain}
Merchant Login URL: https://merchant.heya-pos.com

Login Email: ${formData.email}
Password: ${formData.password}

Please save these credentials securely.
      `;
      alert(message);
      
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

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         merchant.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || merchant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const merchantColumns = [
    {
      accessorKey: "name",
      header: "Merchant Name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Contact Email",
    },
    {
      accessorKey: "subdomain",
      header: "Subdomain",
      cell: ({ row }: any) => (
        <code className="px-2 py-1 bg-muted rounded text-sm">
          {row.original.subdomain}
        </code>
      ),
    },
    {
      accessorKey: "package",
      header: "Package",
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.subscription?.package?.name || 'Basic'}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status || (row.original.isActive ? 'ACTIVE' : 'INACTIVE');
        return (
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
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
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/merchants/${row.original.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Merchants</h1>
        <p className="text-muted-foreground mt-1">Manage merchant accounts and subscriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchants.length}</div>
            <p className="text-xs text-muted-foreground">All registered merchants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Merchants</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {merchants.filter(m => m.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {merchants.reduce((acc, m) => acc + (m._count?.staff || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all merchants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Merchant Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Create New Merchant</CardTitle>
                <CardDescription>Add a new merchant to the platform</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name*</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Hamilton Beauty Salon"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email*</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="merchant@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone*</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+61 400 000 000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN (Optional)</Label>
                  <Input
                    id="abn"
                    value={formData.abn}
                    onChange={(e) => setFormData(prev => ({ ...prev, abn: e.target.value }))}
                    placeholder="12 345 678 901"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subdomain">
                    Subdomain*
                    {checkingAvailability.subdomain && (
                      <span className="ml-2 text-xs text-muted-foreground">Checking...</span>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => handleSubdomainChange(e.target.value)}
                      placeholder="hamilton-beauty"
                      className={!availability.subdomain && formData.subdomain ? 'border-destructive' : ''}
                    />
                    <span className="text-sm text-muted-foreground">.heya-pos.com</span>
                  </div>
                  {!availability.subdomain && formData.subdomain && (
                    <p className="text-xs text-destructive">This subdomain is already taken</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password*</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter a secure password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="package">Package*</Label>
                  <Select
                    value={formData.packageId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, packageId: value }))}
                  >
                    <SelectTrigger id="package">
                      <SelectValue placeholder="Select a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ${pkg.monthlyPrice}/month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateMerchant} 
                disabled={creating || !availability.subdomain}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Merchant'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merchants Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Merchants</CardTitle>
              <CardDescription>View and manage all merchant accounts</CardDescription>
            </div>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Create New Merchant
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search merchants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable columns={merchantColumns} data={filteredMerchants} />
          )}
        </CardContent>
      </Card>
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