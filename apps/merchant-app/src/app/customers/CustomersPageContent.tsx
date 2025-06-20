'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { Skeleton } from '@heya-pos/ui';
import { apiClient } from '@/lib/api-client';
import { ErrorBoundary } from '@/components/error-boundary';

// Lazy load heavy components
const Dialog = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.Dialog })), { ssr: false });
const DialogContent = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.DialogContent })), { ssr: false });
const DialogHeader = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.DialogHeader })), { ssr: false });
const DialogTitle = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.DialogTitle })), { ssr: false });
const DialogDescription = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.DialogDescription })), { ssr: false });
const DialogFooter = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.DialogFooter })), { ssr: false });

const Select = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.Select })), { ssr: false });
const SelectContent = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.SelectContent })), { ssr: false });
const SelectItem = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.SelectItem })), { ssr: false });
const SelectTrigger = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.SelectTrigger })), { ssr: false });
const SelectValue = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.SelectValue })), { ssr: false });

const Tabs = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.Tabs })), { ssr: false });
const TabsContent = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.TabsContent })), { ssr: false });
const TabsList = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.TabsList })), { ssr: false });
const TabsTrigger = dynamic(() => import('@heya-pos/ui').then(mod => ({ default: mod.TabsTrigger })), { ssr: false });

// Lazy load icons - only import the ones we need immediately
import { Plus, Search, Users, TrendingUp, Gift, Clock, Crown } from 'lucide-react';

// Lazy load other icons
const LucideIcons = dynamic(() => import('./customer-icons'), { ssr: false });

// Lazy load complex dialogs
const LoyaltyDialog = dynamic(() => import('@/components/loyalty/LoyaltyDialog').then(mod => ({ default: mod.LoyaltyDialog })), { ssr: false });
const CustomerDetailsDialog = dynamic(() => import('@/components/CustomerDetailsDialog').then(mod => ({ default: mod.CustomerDetailsDialog })), { ssr: false });

// Import types
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

// Helper functions
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-teal-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
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

export default function CustomersPageContent() {
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

  // Load customers in the background after page renders
  useEffect(() => {
    // Use requestIdleCallback to load data when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loadCustomers().finally(() => {
          setIsInitialLoad(false);
        });
      });
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => {
        loadCustomers().finally(() => {
          setIsInitialLoad(false);
        });
      }, 0);
    }
  }, []);

  // Filter customers when data or filters change
  useEffect(() => {
    if (!loading) {
      filterCustomers();
      setCurrentPage(1);
    }
  }, [customers, searchQuery, selectedSegment, sortBy]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log('[CustomersPage] Starting to load customers...');
      
      // Load customers first (fast)
      const customersData = await apiClient.getCustomers();
      console.log('[CustomersPage] Received customers data:', customersData);
      
      // Map the API response to include the stats from backend
      const mappedCustomers = customersData.map((customer: any) => ({
        ...customer,
        totalVisits: customer.visitCount || customer.lifetimeVisits || 0,
        totalSpent: parseFloat(customer.totalSpent || '0'),
        loyaltyPoints: parseInt(customer.loyaltyPoints || '0', 10),
        loyaltyVisits: customer.loyaltyVisits || 0,
      }));
      
      // Show customers immediately with their stats
      setCustomers(mappedCustomers);
      setLoading(false);
      
      // Then load bookings in the background for additional stats
      loadBookingsInBackground(mappedCustomers);
      
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load customers",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadBookingsInBackground = async (customersData: Customer[]) => {
    try {
      // Load ALL bookings including completed ones
      const bookingsData = await apiClient.getBookings({ 
        limit: 100, // V2 API max limit
        // Get bookings from the last year to current + 3 months
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      console.log('[CustomersPage] Loaded bookings:', {
        total: bookingsData.length,
        completed: bookingsData.filter((b: any) => b.status === 'COMPLETED').length,
        customers: customersData.length
      });
      
      // Process bookings in chunks to avoid blocking the UI
      processBookingsInChunks(customersData, bookingsData);
      
    } catch (error: any) {
      // Log more details about the error
      if (typeof window !== 'undefined' && window.console) {
        window.console.error('[CustomersPage] Failed to load bookings:');
        window.console.error('Error message:', error?.message);
        window.console.error('Error response:', error?.response?.data);
        window.console.error('Error status:', error?.response?.status);
      }
      
      // Don't show error to user since this is background loading
      // Customer data is already displayed with backend stats
    }
  };

  const processBookingsInChunks = (customersData: Customer[], bookingsData: any[]) => {
    const CHUNK_SIZE = 100;
    let currentIndex = 0;
    
    const processChunk = () => {
      const endIndex = Math.min(currentIndex + CHUNK_SIZE, bookingsData.length);
      const chunk = bookingsData.slice(currentIndex, endIndex);
      
      // Process this chunk
      const customerStats = new Map();
      
      chunk.forEach(booking => {
        // Process booking stats - try to match customer by name if no ID
        let customerId = booking.customerId || booking.customer?.id;
        
        // If no customer ID, try to match by name
        if (!customerId && booking.customerName) {
          const matchingCustomer = customersData.find(c => 
            `${c.firstName} ${c.lastName}`.toLowerCase() === booking.customerName.toLowerCase()
          );
          if (matchingCustomer) {
            customerId = matchingCustomer.id;
          }
        }
        
        if (!customerId) return;
        
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
        
        if (['COMPLETED', 'completed'].includes(booking.status)) {
          stats.totalVisits++;
          const paidAmount = booking.paidAmount !== undefined ? booking.paidAmount : (booking.totalAmount || booking.price || 0);
          stats.totalSpent += paidAmount;
          
          const bookingDate = new Date(booking.startTime || booking.date);
          if (!stats.lastVisit || bookingDate > stats.lastVisit) {
            stats.lastVisit = bookingDate;
          }
          
          const serviceName = booking.serviceName || 'Service';
          stats.services.set(serviceName, (stats.services.get(serviceName) || 0) + 1);
        }
        
        const bookingDate = new Date(booking.startTime || booking.date);
        const now = new Date();
        
        if (bookingDate > now && !['CANCELLED', 'NO_SHOW', 'cancelled', 'no_show'].includes(booking.status)) {
          stats.upcomingBookings++;
          stats.pendingRevenue += booking.totalAmount || booking.price || 0;
          
          if (!stats.nextAppointment || bookingDate < new Date(stats.nextAppointment.date)) {
            stats.nextAppointment = {
              date: booking.startTime || booking.date,
              service: booking.serviceName || 'Service'
            };
          }
        }
      });
      
      // Update customers with new stats
      setCustomers(prevCustomers => {
        return prevCustomers.map(customer => {
          const stats = customerStats.get(customer.id);
          if (!stats) return customer;
          
          const topServices = Array.from(stats.services.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 2);
          
          return {
            ...customer,
            totalVisits: customer.totalVisits + stats.totalVisits,
            totalSpent: customer.totalSpent + stats.totalSpent,
            updatedAt: stats.lastVisit ? stats.lastVisit.toISOString() : customer.updatedAt,
            topServices,
            nextAppointment: stats.nextAppointment || customer.nextAppointment,
            upcomingBookings: (customer.upcomingBookings || 0) + stats.upcomingBookings,
            pendingRevenue: (customer.pendingRevenue || 0) + stats.pendingRevenue
          };
        });
      });
      
      currentIndex = endIndex;
      
      // Process next chunk if there are more
      if (currentIndex < bookingsData.length) {
        requestAnimationFrame(processChunk);
      }
    };
    
    // Start processing
    requestAnimationFrame(processChunk);
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        
        return fullName.includes(query) ||
          (customer.email && customer.email.toLowerCase().includes(query)) ||
          (customer.phone && customer.phone.includes(searchQuery));
      });
    }

    // Apply segment filter
    if (selectedSegment !== 'all') {
      const now = new Date();
      filtered = filtered.filter(customer => {
        switch (selectedSegment) {
          case 'vip':
            return customer.totalSpent > 1000 || customer.totalVisits > 10;
          case 'regular':
            return customer.totalVisits >= 3 && customer.totalVisits <= 10;
          case 'new':
            return customer.totalVisits === 0;
          case 'inactive':
            const lastVisit = customer.updatedAt ? new Date(customer.updatedAt) : new Date(customer.createdAt);
            const daysSinceLastVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceLastVisit > 90;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'spent':
          return b.totalSpent - a.totalSpent;
        case 'visits':
          return b.totalVisits - a.totalVisits;
        case 'recent':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    setFilteredCustomers(filtered);
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: customers.length,
      vip: customers.filter(c => c.totalSpent > 1000 || c.totalVisits > 10).length,
      newThisMonth: customers.filter(c => c.totalVisits === 0).length,
      totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0)
    };
  }, [customers]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setEditingCustomer(null);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
      loadCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (loading && isInitialLoad) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              <Users className="inline w-3 h-3 mr-1" />
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">VIP Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vip}</div>
            <p className="text-xs text-muted-foreground">
              <Crown className="inline w-3 h-3 mr-1 text-yellow-600" />
              $1000+ or 10+ visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              <Clock className="inline w-3 h-3 mr-1" />
              Recent joins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(stats.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              <Gift className="inline w-3 h-3 mr-1" />
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Suspense fallback={<Skeleton className="h-10 w-32" />}>
          <Select value={selectedSegment} onValueChange={setSelectedSegment}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </Suspense>

        <Suspense fallback={<Skeleton className="h-10 w-32" />}>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="spent">Total spent</SelectItem>
              <SelectItem value="visits">Total visits</SelectItem>
            </SelectContent>
          </Select>
        </Suspense>
      </div>

      {/* Customer List */}
      <Card className="overflow-hidden">
        <div className="p-6">
          {paginatedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">No customers found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchQuery ? 'Try adjusting your search criteria' : 'Add your first customer to get started'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Customer
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedCustomers.map((customer) => {
                const isVIP = customer.totalSpent > 1000 || customer.totalVisits > 10;
                const isNew = customer.totalVisits === 0;
                
                // Only show last visit if customer has actually visited
                const lastVisitDate = customer.totalVisits > 0 && customer.updatedAt ? new Date(customer.updatedAt) : null;
                const daysSinceLastVisit = lastVisitDate ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <div key={customer.id} className="group hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between py-4 px-4 -mx-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold relative shadow-sm",
                          isVIP ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : stringToColor(customer.firstName + customer.lastName)
                        )}>
                          {getInitials(customer.firstName, customer.lastName)}
                          {isVIP && (
                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                              <Crown className="h-3 w-3 text-yellow-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</p>
                            <div className="flex items-center gap-1">
                              {isNew && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 border-0 text-xs px-2 py-0">
                                  New
                                </Badge>
                              )}
                              {isVIP && (
                                <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 text-xs px-2 py-0">
                                  VIP
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="truncate">{customer.email}</span>
                            {customer.phone && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>{customer.phone}</span>
                              </>
                            )}
                            {daysSinceLastVisit !== null && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs">
                                  Last visit: {daysSinceLastVisit === 0 ? 'Today' : 
                                    daysSinceLastVisit === 1 ? 'Yesterday' : 
                                    `${daysSinceLastVisit} days ago`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                          <p className="text-sm font-medium text-gray-900">
                            {customer.totalSpent > 0 ? 
                              `$${customer.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 
                              '-'
                            }
                          </p>
                          {/* Show visits only if > 0 */}
                          {customer.totalVisits > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {customer.totalVisits} {customer.totalVisits === 1 ? 'visit' : 'visits'}
                            </p>
                          )}
                        </div>
                        {customer.loyaltyPoints > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Gift className="h-3 w-3 mr-1" />
                            {customer.loyaltyPoints} pts
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setViewingCustomer(customer)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Customer Dialog */}
      <Suspense fallback={null}>
        <Dialog open={isAddDialogOpen || !!editingCustomer} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingCustomer(null);
            setFormData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              <DialogDescription>
                {editingCustomer ? 'Update customer information' : 'Create a new customer record'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Suspense>

      {/* Customer Details Dialog */}
      {viewingCustomer && (
        <Suspense fallback={null}>
          <CustomerDetailsDialog
            customer={viewingCustomer}
            open={!!viewingCustomer}
            onOpenChange={(open) => {
              if (!open) setViewingCustomer(null);
            }}
            onUpdate={() => {
              // Reload customers after update
              loadCustomers();
            }}
          />
        </Suspense>
      )}

      {/* Loyalty Dialog */}
      {loyaltyDialogCustomer && (
        <Suspense fallback={null}>
          <LoyaltyDialog
            customer={loyaltyDialogCustomer}
            isOpen={!!loyaltyDialogCustomer}
            onClose={() => setLoyaltyDialogCustomer(null)}
          />
        </Suspense>
      )}
    </div>
    </ErrorBoundary>
  );
}