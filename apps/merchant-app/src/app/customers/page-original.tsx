'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@heya-pos/ui';
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Users,
  TrendingUp,
  Gift,
  Clock,
  Star,
  Crown,
  CalendarDays,
  DollarSign,
  MessageSquare,
  MoreVertical,
  Filter,
  Download,
  Upload,
  Cake,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, differenceInDays, isSameMonth } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@heya-pos/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@heya-pos/ui';
import { Skeleton } from '@heya-pos/ui';
import { LoyaltyDialog } from '@/components/loyalty/LoyaltyDialog';
import { CustomerDetailsDialog } from '@/components/CustomerDetailsDialog';
import React from 'react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  notes?: string;
  tags?: string[];
  address?: string;
  suburb?: string;
  postcode?: string;
  marketingConsent?: boolean;
  smsConsent?: boolean;
  preferredContactMethod?: string;
  totalSpent?: number;
  totalVisits?: number;
  loyaltyPoints?: number;
  loyaltyVisits?: number;
  createdAt: string;
  updatedAt: string;
  topServices?: Array<{ name: string; count: number }>;
  nextAppointment?: { date: string; service: string };
  upcomingBookings?: number;
  pendingRevenue?: number;
}

// Helper function to generate consistent color from string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [loyaltyDialogCustomer, setLoyaltyDialogCustomer] = useState<Customer | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Start loading immediately
    loadCustomers().finally(() => {
      setIsInitialLoad(false);
    });
  }, []);

  useEffect(() => {
    filterCustomers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [customers, searchQuery, selectedSegment, sortBy]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      // Fetch customers first
      const customersData = await apiClient.getCustomers();
      
      // For bookings, we need to handle pagination properly
      // Try to get more bookings with a higher limit
      let bookingsData = [];
      try {
        // First try with a high limit
        bookingsData = await apiClient.getBookings({ 
          limit: 1000,  // Get up to 1000 bookings
          includeAll: true,
          // Include future bookings
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days future
        });
      } catch (error) {
        console.error('Failed to get bookings with pagination, falling back:', error);
        // Fallback to simple call
        bookingsData = await apiClient.getBookings({ includeAll: true });
      }
      
      console.log('API Data received:', {
        customers: customersData.length,
        bookings: bookingsData.length,
        bookingDates: bookingsData.slice(0, 5).map(b => ({
          customer: b.customerName,
          date: b.startTime || b.date,
          status: b.status
        }))
      });
      
      // Calculate customer stats from bookings
      const customerStats = new Map();
      
      // Log booking structure to debug
      if (bookingsData.length > 0) {
        console.log('Sample booking structure:', bookingsData[0]);
      }
      
      // Debug: Find Lucas Brown's customer ID first
      const lucasBrown = customersData.find(c => c.firstName === 'Lucas' && c.lastName === 'Brown');
      if (lucasBrown) {
        console.log('Lucas Brown customer ID:', lucasBrown.id);
        
        // Check both ways bookings might reference customers
        const lucasBookings = bookingsData.filter(b => {
          const matchById = b.customerId === lucasBrown.id || b.customer?.id === lucasBrown.id;
          const matchByName = b.customerName === 'Lucas Brown';
          
          if (matchByName && !matchById) {
            console.warn('Found Lucas Brown booking by name but not by ID:', {
              bookingCustomerId: b.customerId,
              bookingCustomerObjId: b.customer?.id,
              lucasId: lucasBrown.id,
              bookingDate: b.startTime || b.date
            });
          }
          
          return matchById || matchByName;
        });
        
        console.log('Lucas Brown bookings found:', {
          count: lucasBookings.length,
          bookings: lucasBookings
        });
        
        // Also search for any booking with Lucas Brown in the name
        const anyLucasBookings = bookingsData.filter(b => 
          b.customerName && b.customerName.toLowerCase().includes('lucas')
        );
        if (anyLucasBookings.length > 0) {
          console.log('All bookings with "Lucas" in name:', anyLucasBookings);
        }
      }
      
      // Create a map of customer names to IDs for fallback matching
      const customerNameToId = new Map();
      customersData.forEach(customer => {
        const fullName = `${customer.firstName} ${customer.lastName}`;
        customerNameToId.set(fullName, customer.id);
      });
      
      bookingsData.forEach(booking => {
        // Try to match by customerId or by customer object id
        let customerId = booking.customerId || booking.customer?.id;
        
        // If we have a customer name, check if the ID matches
        if (booking.customerName && customerNameToId.has(booking.customerName)) {
          const correctCustomerId = customerNameToId.get(booking.customerName);
          if (customerId && correctCustomerId !== customerId) {
            console.warn(`Customer ID mismatch for ${booking.customerName}: booking has ${customerId}, customer record has ${correctCustomerId}`);
          }
          // Always use the ID from the customer record for consistency
          customerId = correctCustomerId;
        }
        
        if (!customerId) {
          console.warn('Booking without customer ID:', booking);
          return;
        }
        
        if (!customerStats.has(customerId)) {
          customerStats.set(customerId, {
            totalVisits: 0,
            totalSpent: 0,
            lastVisit: null,
            services: new Map(),
            nextAppointment: null,
            upcomingBookings: 0,
            pendingRevenue: 0
          });
        }
        
        const stats = customerStats.get(customerId);
        
        // Only count COMPLETED bookings for visits and revenue
        if (['COMPLETED', 'completed'].includes(booking.status)) {
          stats.totalVisits++;
          
          // For completed bookings, if paidAmount is not set, assume the booking was paid in full
          const paidAmount = booking.paidAmount !== undefined ? booking.paidAmount : (booking.totalAmount || booking.price || 0);
          stats.totalSpent += paidAmount;
          
          // Debug log
          if (stats.totalVisits === 1) {
            console.log(`First visit recorded for customer ${customerId}:`, {
              status: booking.status,
              amount: booking.totalAmount || booking.price,
              customerName: booking.customerName
            });
          }
          
          // Track last visit
          const bookingDate = new Date(booking.startTime || booking.date);
          if (!stats.lastVisit || bookingDate > stats.lastVisit) {
            stats.lastVisit = bookingDate;
          }
          
          // Track services
          const serviceName = booking.serviceName || 'Service';
          stats.services.set(serviceName, (stats.services.get(serviceName) || 0) + 1);
        }
        
        // Track upcoming bookings and pending revenue
        const bookingDate = new Date(booking.startTime || booking.date);
        const now = new Date();
        
        if (bookingDate > now && !['CANCELLED', 'NO_SHOW', 'cancelled', 'no_show'].includes(booking.status)) {
          stats.upcomingBookings++;
          stats.pendingRevenue += booking.totalAmount || booking.price || 0;
          
          // Track next appointment
          if (!stats.nextAppointment || bookingDate < new Date(stats.nextAppointment.date)) {
            stats.nextAppointment = {
              date: booking.startTime || booking.date,
              service: booking.serviceName || 'Service'
            };
          }
        }
      });
      
      // Enrich customers with calculated stats
      const enrichedCustomers = customersData.map(customer => {
        const stats = customerStats.get(customer.id) || {
          totalVisits: 0,
          totalSpent: 0,
          lastVisit: null,
          services: new Map(),
          nextAppointment: null,
          upcomingBookings: 0,
          pendingRevenue: 0
        };
        
        // Convert services map to sorted array of top services
        const topServices = Array.from(stats.services.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2);
        
        return {
          ...customer,
          totalVisits: stats.totalVisits,
          totalSpent: stats.totalSpent,
          updatedAt: stats.lastVisit ? stats.lastVisit.toISOString() : customer.updatedAt,
          topServices,
          nextAppointment: stats.nextAppointment,
          upcomingBookings: stats.upcomingBookings,
          pendingRevenue: stats.pendingRevenue
        };
      });
      
      console.log('Customer stats calculation:', {
        totalCustomers: customersData.length,
        totalBookings: bookingsData.length,
        customersWithStats: customerStats.size,
        sampleStats: Array.from(customerStats.entries()).slice(0, 3)
      });
      
      // Debug Lucas Brown's final stats
      if (lucasBrown) {
        const lucasStats = customerStats.get(lucasBrown.id);
        console.log('Lucas Brown final stats:', {
          customerId: lucasBrown.id,
          stats: lucasStats,
          hasStats: customerStats.has(lucasBrown.id)
        });
      }
      setCustomers(enrichedCustomers);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(customer => {
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = customer.phone || '';
        const query = searchQuery.toLowerCase();
        
        return fullName.includes(query) ||
          email.includes(query) ||
          phone.includes(searchQuery);
      });
    }

    // Apply segment filter
    if (selectedSegment !== 'all') {
      const now = new Date();
      filtered = filtered.filter(customer => {
        switch (selectedSegment) {
          case 'vip':
            return (customer.totalSpent || 0) > 1000 || (customer.totalVisits || 0) > 10;
          case 'regular':
            return (customer.totalVisits || 0) >= 3 && (customer.totalVisits || 0) <= 10;
          case 'new':
            const createdDate = new Date(customer.createdAt);
            const daysSinceCreation = differenceInDays(now, createdDate);
            return daysSinceCreation <= 30;
          case 'inactive':
            const lastVisit = new Date(customer.updatedAt);
            const daysSinceVisit = differenceInDays(now, lastVisit);
            return daysSinceVisit > 90;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        case 'spent':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'visits':
          return (b.totalVisits || 0) - (a.totalVisits || 0);
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: ''
    });
  };

  const handleSaveCustomer = async () => {
    try {
      if (editingCustomer) {
        await apiClient.updateCustomer(editingCustomer.id, formData);
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        await apiClient.createCustomer(formData);
        toast({
          title: "Success",
          description: "Customer created successfully",
        });
      }
      setIsAddDialogOpen(false);
      resetForm();
      setEditingCustomer(null);
      await loadCustomers();
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes || ''
    });
    setIsAddDialogOpen(true);
  };

  const openViewDialog = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  // Calculate customer stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    const newThisMonth = customers.filter(c => 
      new Date(c.createdAt) >= monthStart
    ).length;
    
    const birthdaysThisMonth = customers.filter(c => {
      if (!c.dateOfBirth) return false;
      const birthDate = new Date(c.dateOfBirth);
      return isSameMonth(birthDate, now);
    }).length;
    
    const vipCustomers = customers.filter(c => 
      (c.totalSpent || 0) > 1000 || (c.totalVisits || 0) > 10
    ).length;
    
    const activeCustomers = customers.filter(c => {
      if (!c.updatedAt) return false;
      const lastVisit = new Date(c.updatedAt);
      const daysSinceVisit = differenceInDays(now, lastVisit);
      return daysSinceVisit <= 90; // Active if visited in last 90 days
    }).length;
    
    return {
      total: customers.length,
      newThisMonth,
      birthdaysThisMonth,
      vipCustomers,
      activeCustomers
    };
  }, [customers]);

  // Show skeleton during initial load
  if (isInitialLoad && loading) {
    return (
      <div className="container mx-auto p-6 space-y-6 animate-in fade-in-0 duration-300">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-full mb-2" />
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-full mb-4" />
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => {/* TODO: Export customers */}}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => {/* TODO: Import customers */}}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </div>
      </div>

      {/* Customer Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-green-600">+{stats.newThisMonth} this month</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold">{stats.activeCustomers}</p>
                <p className="text-sm text-gray-500">Last 90 days</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">VIP Customers</p>
                <p className="text-2xl font-bold">{stats.vipCustomers}</p>
                <p className="text-sm text-yellow-600">High value</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Birthdays</p>
                <p className="text-2xl font-bold">{stats.birthdaysThisMonth}</p>
                <p className="text-sm text-blue-600">This month</p>
              </div>
              <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center">
                <Cake className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold">{stats.newThisMonth}</p>
                <p className="text-sm text-purple-600">First-time visitors</p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>
          
          {/* Search and filters */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent Activity</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="spent">Total Spent</SelectItem>
                  <SelectItem value="visits">Total Visits</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Segment tabs */}
            <Tabs value={selectedSegment} onValueChange={setSelectedSegment}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="vip">
                  <Crown className="h-4 w-4 mr-1" />
                  VIP
                </TabsTrigger>
                <TabsTrigger value="regular">Regular</TabsTrigger>
                <TabsTrigger value="new">
                  <Star className="h-4 w-4 mr-1" />
                  New
                </TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedSegment !== 'all' ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 
                  'Try adjusting your search or filters' : 
                  selectedSegment !== 'all' ? 
                    `No ${selectedSegment} customers found` :
                    'Start by adding your first customer'
                }
              </p>
              {!searchQuery && selectedSegment === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Customer
                </Button>
              )}
            </div>
          ) : (
            <>
            <div className="grid gap-4">
              {filteredCustomers
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((customer) => {
                const isVIP = (customer.totalSpent || 0) > 1000 || (customer.totalVisits || 0) > 10;
                const lastVisit = customer.updatedAt ? new Date(customer.updatedAt) : null;
                const daysSinceVisit = lastVisit ? differenceInDays(new Date(), lastVisit) : null;
                const isInactive = daysSinceVisit && daysSinceVisit > 90;
                const hasBirthday = customer.dateOfBirth && isSameMonth(new Date(customer.dateOfBirth), new Date());
                
                return (
                  <TooltipProvider key={customer.id}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                  <Card
                    className={cn(
                      "transition-all relative overflow-hidden cursor-pointer",
                      "hover:translate-y-[-2px] hover:shadow-lg",
                      isVIP && "ring-1 ring-yellow-400",
                      isInactive && "opacity-75"
                    )}
                  >
                    {isVIP && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-transparent w-32 h-full opacity-10" />
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => openViewDialog(customer)}>
                          <div className="flex items-start gap-4">
                            {/* Avatar with initials */}
                            <div className="relative">
                              <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold",
                                stringToColor(`${customer.firstName} ${customer.lastName}`)
                              )}>
                                {getInitials(customer.firstName, customer.lastName)}
                              </div>
                              {isVIP && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                  <Crown className="h-4 w-4 text-yellow-600" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold flex items-center gap-1.5">
                                  {customer.firstName} {customer.lastName}
                                  {/* Status icons next to name */}
                                  {isVIP && (
                                    <Crown className="h-4 w-4 text-yellow-600" title="VIP Customer" />
                                  )}
                                  {differenceInDays(new Date(), new Date(customer.createdAt)) <= 30 && (
                                    <Star className="h-4 w-4 text-purple-600" title="New Customer" />
                                  )}
                                  {hasBirthday && (
                                    <Cake className="h-4 w-4 text-pink-600" title="Birthday this month" />
                                  )}
                                </h3>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1 group">
                                  <Mail className="h-4 w-4" />
                                  <span>{customer.email}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(customer.email, 'Email');
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-1 group">
                                  <Phone className="h-4 w-4" />
                                  <span>{customer.mobile || customer.phone}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(customer.mobile || customer.phone, 'Phone');
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Tag chips for categorization */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Customer type tags */}
                                {isVIP && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                    VIP Customer
                                  </span>
                                )}
                                {(customer.totalVisits || 0) >= 3 && (customer.totalVisits || 0) <= 10 && !isVIP && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                    Regular
                                  </span>
                                )}
                                {(customer.totalVisits || 0) === 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                    New Customer
                                  </span>
                                )}
                                {isInactive && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                    Inactive {daysSinceVisit}+ days
                                  </span>
                                )}
                                {hasBirthday && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200">
                                    Birthday this month
                                  </span>
                                )}
                              </div>
                              
                              {(customer.totalVisits || 0) > 0 ? (
                                <div className="flex items-center gap-6 text-sm">
                                  <span className="text-gray-600">
                                    {customer.totalVisits || 0} completed {(customer.totalVisits || 0) === 1 ? 'visit' : 'visits'}
                                    {(customer.totalSpent || 0) > 0 && ` • $${(customer.totalSpent || 0).toFixed(0)} paid`}
                                  </span>
                                  {lastVisit && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-500">
                                        Last visit {daysSinceVisit === 0 ? 'today' : 
                                          daysSinceVisit === 1 ? 'yesterday' : 
                                          `${daysSinceVisit} days ago`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : customer.upcomingBookings > 0 ? (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">No visits yet</span> • 
                                  <span className="text-purple-600">
                                    {customer.upcomingBookings} upcoming {customer.upcomingBookings === 1 ? 'booking' : 'bookings'}
                                  </span>
                                  {customer.pendingRevenue > 0 && (
                                    <span className="text-gray-500"> • ${customer.pendingRevenue} pending</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  Joined {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                                </div>
                              )}
                              
                              {/* Additional customer insights */}
                              <div className="space-y-1.5 mt-2">
                                {/* Loyalty display - prominently shown */}
                                {(Number(customer.loyaltyPoints) > 0 || Number(customer.loyaltyVisits) > 0) && (
                                  <div className="flex items-center gap-1.5">
                                    {Number(customer.loyaltyVisits) > 0 ? (
                                      <>
                                        <Gift className="h-5 w-5 text-purple-600" />
                                        <span className="text-base font-semibold text-purple-600">
                                          {customer.loyaltyVisits} loyalty visits
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                                        <span className="text-base font-semibold text-yellow-600">
                                          {customer.loyaltyPoints} points
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                                
                                {/* Top services */}
                                {customer.topServices && customer.topServices.length > 0 && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Usually books:</span> {customer.topServices.slice(0, 2).map(s => s.name).join(', ')}
                                  </div>
                                )}
                                
                                {/* Next appointment */}
                                {customer.nextAppointment && (
                                  <div className="text-sm text-green-600 font-medium">
                                    Next visit: {format(new Date(customer.nextAppointment.date), 'MMM d')} - {customer.nextAppointment.service}
                                  </div>
                                )}
                                
                                {/* Customer notes preview */}
                                {customer.notes && (
                                  <div className="flex items-start gap-1.5 text-sm text-gray-500">
                                    <span className="text-base">💭</span>
                                    <span className="italic">"{customer.notes.substring(0, 50)}{customer.notes.length > 50 ? '...' : ''}"</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/bookings/new?customerId=${customer.id}`);
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Book
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openViewDialog(customer)}>
                                Quick View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Full Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {/* TODO: Send message */}}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {/* TODO: Add note */}}>
                                Add Note
                              </DropdownMenuItem>
                              {(customer.loyaltyPoints || customer.loyaltyVisits) && (
                                <DropdownMenuItem onClick={() => setLoyaltyDialogCustomer(customer)}>
                                  <Gift className="h-4 w-4 mr-2" />
                                  Manage Loyalty
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Click for quick view</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
            
            {/* Pagination */}
            {filteredCustomers.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{' '}
                    {filteredCustomers.length} customers
                  </p>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredCustomers.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
                        return page === 1 || 
                               page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-1 text-gray-400">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredCustomers.length / itemsPerPage)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'New Customer'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Update customer information' : 'Add a new customer to your database'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
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
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.mobile || formData.phone}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value, phone: e.target.value })}
                placeholder="+61 400 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special notes about this customer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer}>
              {editingCustomer ? 'Update' : 'Create'} Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      {viewingCustomer && (
        <CustomerDetailsDialog
          customer={viewingCustomer}
          open={!!viewingCustomer}
          onOpenChange={(open) => {
            if (!open) setViewingCustomer(null);
          }}
          onUpdate={() => {
            loadCustomers();
            setViewingCustomer(null);
          }}
        />
      )}

      {/* Loyalty Management Dialog */}
      {loyaltyDialogCustomer && (
        <LoyaltyDialog
          customer={loyaltyDialogCustomer}
          open={!!loyaltyDialogCustomer}
          onOpenChange={(open) => {
            if (!open) setLoyaltyDialogCustomer(null);
          }}
          onSuccess={() => {
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}