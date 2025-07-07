'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { DataTable } from '@heya-pos/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@heya-pos/ui';
import { Switch } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { 
  Plus, 
  Search, 
  User,
  Users, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
  Key,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth/auth-provider';

interface Staff {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone?: string;
  pin?: string;
  accessLevel: number;
  calendarColor: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

const accessLevels = [
  { value: 1, label: 'Employee', description: 'Basic access' },
  { value: 2, label: 'Manager', description: 'Can manage bookings and view reports' },
  { value: 3, label: 'Owner', description: 'Full access to all features' },
];

const calendarColors = [
  { value: 'auto', label: 'Auto', isAuto: true },
  // High contrast primary colors
  { value: '#DC2626', label: 'Red' },
  { value: '#059669', label: 'Green' },
  { value: '#2563EB', label: 'Blue' },
  { value: '#EA580C', label: 'Orange' },
  // Secondary colors with varied saturation
  { value: '#7C3AED', label: 'Purple' },
  { value: '#0891B2', label: 'Cyan' },
  { value: '#DB2777', label: 'Pink' },
  { value: '#CA8A04', label: 'Yellow' },
  // Darker variants for contrast
  { value: '#7C2D12', label: 'Brown' },
  { value: '#1E3A8A', label: 'Navy' },
  { value: '#166534', label: 'Forest' },
  { value: '#86198F', label: 'Magenta' },
  // Lighter variants for variety
  { value: '#60A5FA', label: 'Sky' },
  { value: '#34D399', label: 'Mint' },
  { value: '#F472B6', label: 'Rose' },
  { value: '#A78BFA', label: 'Lavender' },
];

export default function StaffPageContent() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [generatedPinDialog, setGeneratedPinDialog] = useState<{ open: boolean; pin?: string; name?: string }>({ open: false });
  const [isResetPinDialogOpen, setIsResetPinDialogOpen] = useState(false);
  const [resetPinData, setResetPinData] = useState({ pin: '', showPin: false });
  const { toast } = useToast();
  const { merchant } = useAuth();
  
  // Check if PIN is required for staff
  // Only show as optional when explicitly set to false
  const isPinRequired = !merchant || merchant.settings?.requirePinForStaff !== false;

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pin: '',
    accessLevel: 1,
    calendarColor: 'auto',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getStaff();
      setStaff(data);
    } catch (error) {
      console.error('Failed to load staff:', error);
      toast({
        title: "Error",
        description: "Failed to load staff members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && member.status === 'ACTIVE') ||
      (statusFilter === 'inactive' && member.status === 'INACTIVE');
    
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    
    // Validate PIN if provided or required
    if (formData.pin && !/^\d{4}$/.test(formData.pin)) {
      toast({
        title: "Error",
        description: "PIN must be exactly 4 digits",
        variant: "destructive",
      });
      return;
    }

    // If PIN is required but not provided
    if (isPinRequired && !formData.pin) {
      toast({
        title: "Error",
        description: "PIN is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiClient.createStaff({
        ...formData,
        pin: formData.pin || undefined, // Send undefined if no PIN
      });
      
      // If a PIN was generated and PINs are required, show it
      if (response.generatedPin && response.pin && isPinRequired) {
        setGeneratedPinDialog({
          open: true,
          pin: response.pin,
          name: response.lastName ? `${response.firstName} ${response.lastName}` : response.firstName,
        });
      } else {
        // Show success message
        toast({
          title: "Success",
          description: "Staff member created successfully",
        });
      }
      
      setIsCreateDialogOpen(false);
      resetForm();
      loadStaff();
    } catch (error: any) {
      console.error('Staff creation error:', error);
      
      // Extract the most helpful error message
      let errorMessage = "Failed to create staff member";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // If it's a validation error, show field-specific errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(', ');
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;
    
    // Validate PIN if provided
    if (formData.pin && !/^\d{4}$/.test(formData.pin)) {
      toast({
        title: "Error",
        description: "PIN must be exactly 4 digits",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare update data without email field
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        accessLevel: formData.accessLevel,
        calendarColor: formData.calendarColor,
        status: formData.status,
      };
      
      // If pin is provided, include it
      if (formData.pin) {
        updateData.pin = formData.pin;
      }
      
      const response = await apiClient.updateStaff(selectedStaff.id, updateData);
      
      // Show success message
      toast({
        title: "Success",
        description: formData.pin ? "Staff member and PIN updated successfully" : "Staff member updated successfully",
      });
      
      setIsEditDialogOpen(false);
      resetForm();
      loadStaff();
    } catch (error: any) {
      console.error('Staff update error:', error);
      
      // Extract the most helpful error message
      let errorMessage = "Failed to update staff member";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await apiClient.deleteStaff(id);
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      loadStaff();
    } catch (error: any) {
      console.error('Staff delete error:', error);
      
      // Extract the most helpful error message
      let errorMessage = "Failed to delete staff member";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (member: Staff) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      await apiClient.updateStaff(member.id, { status: newStatus });
      toast({
        title: "Success",
        description: `Staff member ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      });
      loadStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update staff status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      pin: '',
      accessLevel: 1,
      calendarColor: 'auto',
      status: 'ACTIVE',
    });
    setSelectedStaff(null);
    setShowPin(false);
  };

  const openEditDialog = (member: Staff) => {
    setSelectedStaff(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      pin: '', // Don't show existing PIN
      accessLevel: member.accessLevel,
      calendarColor: member.calendarColor,
      status: member.status,
    });
    setIsEditDialogOpen(true);
  };

  const openResetPinDialog = (member: Staff) => {
    setSelectedStaff(member);
    setResetPinData({ pin: '', showPin: false });
    setIsResetPinDialogOpen(true);
  };

  const handleResetPin = async () => {
    if (!selectedStaff) return;
    
    try {
      let newPin = resetPinData.pin;
      
      // Generate PIN if not provided
      if (!newPin) {
        newPin = Math.floor(1000 + Math.random() * 9000).toString();
      } else {
        // Validate PIN if provided
        if (!/^\d{4}$/.test(newPin)) {
          toast({
            title: "Error",
            description: "PIN must be exactly 4 digits",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Update staff with new PIN
      const response = await apiClient.updateStaff(selectedStaff.id, { pin: newPin });
      
      // Show the new PIN
      setGeneratedPinDialog({
        open: true,
        pin: newPin,
        name: selectedStaff.lastName ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : selectedStaff.firstName,
      });
      
      setIsResetPinDialogOpen(false);
      loadStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reset PIN",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      id: 'name',
      header: 'Staff Member',
      accessorKey: 'name',
      cell: ({ row }: any) => {
        const staff = row.original;
        const fullName = staff.lastName ? `${staff.firstName} ${staff.lastName}` : staff.firstName;
        const initials = staff.lastName 
          ? `${staff.firstName[0]}${staff.lastName[0]}` 
          : staff.firstName.slice(0, 2).toUpperCase();
        
        return (
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: staff.calendarColor }}
            >
              {initials}
            </div>
            <div>
              <p className="font-medium">{fullName}</p>
              <p className="text-sm text-gray-500">{staff.email || 'No email'}</p>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{row.original.phone || '-'}</span>
        </div>
      )
    },
    {
      accessorKey: 'accessLevel',
      header: 'Access Level',
      cell: ({ row }: any) => {
        const level = accessLevels.find(l => l.value === row.original.accessLevel);
        return (
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-gray-400" />
            <span>{level?.label || 'Unknown'}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {row.original.status === 'ACTIVE' ? (
            <>
              <UserCheck className="h-3 w-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <UserX className="h-3 w-3 mr-1" />
              Inactive
            </>
          )}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const staff = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(staff)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openResetPinDialog(staff)}>
                <Key className="h-4 w-4 mr-2" />
                Reset PIN
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleToggleStatus(staff)}
                className={staff.status === 'ACTIVE' ? 'text-orange-600' : 'text-green-600'}
              >
                {staff.status === 'ACTIVE' ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDelete(staff.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter(s => s.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers & Owners</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter(s => s.accessLevel >= 2).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">Loading staff...</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredStaff}
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="access">Access & Security</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="access" className="space-y-4 mt-4">
              {!isPinRequired && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    PIN is optional for staff members. If you don't set a PIN, one will be automatically generated.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="pin">
                  PIN Code {isPinRequired && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      if (value.length <= 4) {
                        setFormData({ ...formData, pin: value });
                      }
                    }}
                    placeholder={isPinRequired ? "4-digit PIN (required)" : "4-digit PIN (optional)"}
                    maxLength={4}
                    required={isPinRequired}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  {isPinRequired 
                    ? "Staff will use this 4-digit PIN for authorizing actions"
                    : "Staff will use this 4-digit PIN for authorizing actions. Leave empty to auto-generate."
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select 
                  value={formData.accessLevel.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, accessLevel: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map(level => (
                      <SelectItem key={level.value} value={level.value.toString()}>
                        <div>
                          <p className="font-medium">{level.label}</p>
                          <p className="text-sm text-gray-500">{level.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="preferences" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Calendar Color</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Choose a color for the calendar or select "Auto" to automatically assign an available color
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {calendarColors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      className={`h-10 rounded-md border-2 relative overflow-hidden ${
                        formData.calendarColor === color.value ? 'border-gray-900' : 'border-gray-300'
                      } ${color.isAuto ? 'bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400' : ''}`}
                      style={color.isAuto ? {} : { backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, calendarColor: color.value })}
                    >
                      {color.isAuto && (
                        <span className="text-white font-medium text-sm">Auto</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Staff Member
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="access">Access & Security</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="access" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="pin">New PIN Code (leave empty to keep current)</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      if (value.length <= 4) {
                        setFormData({ ...formData, pin: value });
                      }
                    }}
                    placeholder="4-digit PIN"
                    maxLength={4}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Leave empty to keep the current PIN</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accessLevel">Access Level</Label>
                <Select 
                  value={formData.accessLevel.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, accessLevel: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map(level => (
                      <SelectItem key={level.value} value={level.value.toString()}>
                        <div>
                          <p className="font-medium">{level.label}</p>
                          <p className="text-sm text-gray-500">{level.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="preferences" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Calendar Color</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Choose a color for the calendar or select "Auto" to automatically assign an available color
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {calendarColors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      className={`h-10 rounded-md border-2 relative overflow-hidden ${
                        formData.calendarColor === color.value ? 'border-gray-900' : 'border-gray-300'
                      } ${color.isAuto ? 'bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400' : ''}`}
                      style={color.isAuto ? {} : { backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, calendarColor: color.value })}
                    >
                      {color.isAuto && (
                        <span className="text-white font-medium text-sm">Auto</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Update Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PIN Dialog */}
      <Dialog open={isResetPinDialogOpen} onOpenChange={setIsResetPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN for {selectedStaff?.firstName} {selectedStaff?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New PIN</Label>
              <div className="relative">
                <Input
                  type={resetPinData.showPin ? "text" : "password"}
                  placeholder="Leave blank to auto-generate"
                  value={resetPinData.pin}
                  onChange={(e) => setResetPinData({ ...resetPinData, pin: e.target.value })}
                  maxLength={4}
                />
                <button
                  type="button"
                  className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                  onClick={() => setResetPinData({ ...resetPinData, showPin: !resetPinData.showPin })}
                >
                  {resetPinData.showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Must be exactly 4 digits. Leave blank to generate a random PIN.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPinDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPin}>
              Reset PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated PIN Dialog */}
      <Dialog open={generatedPinDialog.open} onOpenChange={(open) => setGeneratedPinDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIN for {generatedPinDialog.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {isPinRequired ? (
                  <>A PIN has been set for <strong>{generatedPinDialog.name}</strong>.
                  Please save this PIN as it will not be shown again.</>
                ) : (
                  <>The PIN for <strong>{generatedPinDialog.name}</strong> has been set.
                  Staff can use this PIN for authentication if needed.</>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-2">Generated PIN</p>
              <p className="text-3xl font-bold tracking-widest">{generatedPinDialog.pin}</p>
            </div>
            
            {isPinRequired && (
              <p className="text-sm text-gray-600">
                This PIN is required for the staff member to log in and authorize actions. 
                Make sure to share it securely with them.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setGeneratedPinDialog({ open: false });
                toast({
                  title: "Success",
                  description: "Staff member created successfully",
                });
              }}
            >
              I've saved the PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}