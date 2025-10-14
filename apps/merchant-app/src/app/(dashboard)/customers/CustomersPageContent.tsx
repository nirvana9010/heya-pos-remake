'use client';

import { useState, useEffect, useMemo, lazy, Suspense, useCallback, useRef } from 'react';
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
import { apiClient, CreateCustomerRequest } from '@/lib/api-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { prefetchManager } from '@/lib/prefetch';

// Import UI components normally - they're already optimized
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@heya-pos/ui';

// Lazy load icons - only import the ones we need immediately
import { Plus, Search, Users, TrendingUp, Gift, Clock, Crown } from 'lucide-react';

// Lazy load other icons
const LucideIcons = dynamic(() => import('./customer-icons'), { ssr: false });

// Only lazy load truly heavy components
const LoyaltyDialog = dynamic(() => import('@/components/loyalty/LoyaltyDialog').then(mod => ({ default: mod.LoyaltyDialog })), { 
  loading: () => null,
  ssr: false 
});
const CustomerDetailsDialog = dynamic(() => import('@/components/CustomerDetailsDialog').then(mod => ({ default: mod.CustomerDetailsDialog })), { 
  loading: () => null,
  ssr: false 
});

// Import types
interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobile?: string | null;
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

const getInitials = (firstName: string, lastName: string | null | undefined) => {
  const firstInitial = firstName ? firstName.charAt(0) : '';
  const lastInitial = lastName ? lastName.charAt(0) : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

const formatPhoneNumber = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return trimmed;
  }

  let normalized = digits;

  if (digits.startsWith('61') && digits.length >= 9) {
    const withoutCountryCode = digits.slice(2);
    normalized = withoutCountryCode.startsWith('0')
      ? withoutCountryCode
      : `0${withoutCountryCode}`;
  }

  if (normalized.length === 10 && normalized.startsWith('04')) {
    return normalized.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  if (normalized.length === 10 && /^0[2378]/.test(normalized)) {
    return normalized.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
  }

  if (trimmed.startsWith('+61')) {
    const localPortion = trimmed.slice(3).replace(/\s+/g, '');
    if (localPortion.length >= 3) {
      return `+61 ${localPortion}`;
    }
  }

  return trimmed;
};

const getDisplayPhone = (customer: Customer) => {
  const rawPhone = customer.mobile ?? customer.phone ?? '';
  if (!rawPhone) {
    return '';
  }

  return formatPhoneNumber(rawPhone);
};

const sanitizeOptionalField = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default function CustomersPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [serverTotalPages, setServerTotalPages] = useState(0);
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
  const [isSearching, setIsSearching] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    vip: 0,
    newThisMonth: 0,
    totalRevenue: 0
  });
  const [isRemoteSearchResult, setIsRemoteSearchResult] = useState(false);

  const isFiltering = Boolean(searchQuery?.trim()) || selectedSegment !== 'all';

  // Forward declaration of loadCustomers to avoid hoisting issues
  const loadCustomersRef = useRef<(params?: { search?: string; limit?: number; page?: number }) => Promise<void>>();

  // Define searchCustomers early using useCallback to avoid hoisting issues
  const searchCustomers = useCallback(async (query: string) => {
    // Clear timeout if there's a pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If empty query, reload all customers to reset from search results
    if (!query || query.trim().length === 0) {
      setIsSearching(false);
      setIsRemoteSearchResult(false);
      // Reload all customers to clear search results
      loadCustomersRef.current?.({ limit: itemsPerPage, page: currentPage });
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setIsRemoteSearchResult(false);
      
      // Store current selection position before search
      const input = searchInputRef.current;
      const selectionStart = input?.selectionStart ?? null;
      const selectionEnd = input?.selectionEnd ?? null;
      
      try {
        const response = await apiClient.customers.searchCustomers(query);

        // Handle response
        const customersData = response.data || [];
        const totalCount = response.total ?? customersData.length;
        
        // Map the API response
        const mappedCustomers = customersData.map((customer: any) => ({
          ...customer,
          totalVisits: customer.visitCount || 0,
          totalSpent: customer.totalSpent || 0,
          loyaltyPoints: customer.loyaltyPoints || 0,
          loyaltyVisits: customer.loyaltyVisits || 0,
        }));
        setCustomers(mappedCustomers);
        setFilteredCustomers(mappedCustomers);
        setTotalCustomers(totalCount);
        setServerTotalPages(1);
        setIsRemoteSearchResult(true);
      } catch (error: any) {
        console.error('Customer search failed:', error);
        toast({
          title: "Search Error",
          description: error.response?.data?.message || "Failed to search customers",
          variant: "destructive",
        });
        setIsRemoteSearchResult(false);
      } finally {
        setIsSearching(false);

        const isInputActive = input && document.activeElement === input;
        const shouldRestoreSelection =
          isInputActive &&
          input.value === query &&
          selectionStart !== null &&
          selectionEnd !== null;

        if (shouldRestoreSelection) {
          requestAnimationFrame(() => {
            if (!input || document.activeElement !== input) {
              return;
            }
            input.setSelectionRange(selectionStart, selectionEnd);
          });
        }
      }
    }, 300); // 300ms debounce
  }, [toast, itemsPerPage, currentPage]);

  // Load customers and stats immediately on mount
  useEffect(() => {
    // Load customers
    loadCustomersRef.current?.({ limit: itemsPerPage, page: 1 });
    setIsRemoteSearchResult(false);
    
    // Fetch real stats from the database separately
    apiClient.customers.getStats()
      .then(stats => {
        if (stats) {
          setGlobalStats(stats);
        }
      })
      .catch(error => {
        console.error('Failed to load customer stats:', error);
        toast({
          title: "Warning",
          description: "Failed to load customer statistics",
          variant: "default",
        });
      });
    
    setIsInitialLoad(false);
  }, [itemsPerPage, toast]);

  // Handle search query changes
  useEffect(() => {
    if (!isInitialLoad) {
      searchCustomers(searchQuery);
    }
  }, [searchQuery, searchCustomers, isInitialLoad]);

  // Filter customers when segment, sort, or search query changes
  useEffect(() => {
    if (!loading && !isSearching) {
      filterCustomers();
    }
  }, [customers, selectedSegment, sortBy, searchQuery, loading, isSearching, isRemoteSearchResult]);

  // Reset pagination when filters are applied
  useEffect(() => {
    const hasActiveFilters = Boolean(searchQuery?.trim()) || selectedSegment !== 'all';
    if (!loading && !isSearching && hasActiveFilters) {
      setCurrentPage(1);
    }
  }, [searchQuery, selectedSegment, sortBy, loading, isSearching]);

  const loadCustomers = async (params?: { search?: string; limit?: number; page?: number }) => {
    try {
      setLoading(true);
      
      const requestedLimit = params?.limit ?? itemsPerPage;
      const requestedPage = params?.page ?? currentPage;

      // Use pagination for better performance
      const apiParams = {
        limit: requestedLimit,
        page: requestedPage,
        ...params
      };
      
      // Load customers from API with parameters
      const response = await apiClient.customers.getCustomers(apiParams);
      
      // Handle paginated response
      const customersData = response.data || [];
      const meta = response.meta || {};
      const totalCount = meta.total ?? customersData.length;
      const responseLimit = meta.limit ?? requestedLimit;
      const responsePage = meta.page ?? requestedPage;
      
      // Map the API response to include the stats from backend
      const mappedCustomers = customersData.map((customer: any) => ({
        ...customer,
        totalVisits: customer.visitCount || 0,
        totalSpent: customer.totalSpent || 0,
        loyaltyPoints: customer.loyaltyPoints || 0,
        loyaltyVisits: customer.loyaltyVisits || 0,
      }));
      
      // Show customers immediately with their stats from backend
      setCustomers(mappedCustomers);
      setFilteredCustomers(mappedCustomers);
      setTotalCustomers(totalCount);
      const calculatedTotalPages = meta.totalPages ?? (responseLimit > 0 ? Math.ceil(totalCount / responseLimit) : 1);
      setServerTotalPages(Math.max(1, calculatedTotalPages));
      setCurrentPage(responsePage);
      setLoading(false);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load customers",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Assign loadCustomers to ref
  loadCustomersRef.current = loadCustomers;

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
          
          const bookingDateStr = booking.startTime || booking.date;
          if (bookingDateStr) {
            const bookingDate = new Date(bookingDateStr);
            if (!isNaN(bookingDate.getTime())) {
              if (!stats.lastVisit || bookingDate > stats.lastVisit) {
                stats.lastVisit = bookingDate;
              }
            }
          }
          
          const serviceName = booking.serviceName || 'Service';
          stats.services.set(serviceName, (stats.services.get(serviceName) || 0) + 1);
        }
        
        const bookingDateStr = booking.startTime || booking.date;
        if (bookingDateStr) {
          const bookingDate = new Date(bookingDateStr);
          const now = new Date();
          
          if (!isNaN(bookingDate.getTime()) && bookingDate > now && !['CANCELLED', 'NO_SHOW', 'cancelled', 'no_show'].includes(booking.status)) {
            stats.upcomingBookings++;
            stats.pendingRevenue += booking.totalAmount || booking.price || 0;
            
            if (!stats.nextAppointment || bookingDate < new Date(stats.nextAppointment.date)) {
              stats.nextAppointment = {
                date: bookingDateStr,
                service: booking.serviceName || 'Service'
              };
            }
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
            updatedAt: stats.lastVisit && stats.lastVisit instanceof Date && !isNaN(stats.lastVisit.getTime()) 
              ? stats.lastVisit.toISOString() 
              : customer.updatedAt,
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

    const hasSearchQuery = Boolean(searchQuery && searchQuery.trim().length > 0);

    // Apply client-side search filtering only when we don't have remote search results
    if (hasSearchQuery && !isSearching && !isRemoteSearchResult) {
      const query = searchQuery.toLowerCase();
      const numericQuery = searchQuery.replace(/\D/g, '');
      filtered = filtered.filter(customer => {
        const firstName = customer.firstName?.toLowerCase() || '';
        const lastName = customer.lastName?.toLowerCase() || '';
        const email = customer.email?.toLowerCase() || '';
        const phoneDigits = (customer.phone || '').replace(/\D/g, '');
        const mobileDigits = (customer.mobile || customer.phone || '').replace(/\D/g, '');

        const stringMatch =
          firstName.includes(query) ||
          lastName.includes(query) ||
          email.includes(query) ||
          (customer.phone || '').includes(query) ||
          (customer.mobile || '').includes(query);

        if (stringMatch) {
          return true;
        }

        if (!numericQuery) {
          return false;
        }

        return (
          phoneDigits.includes(numericQuery) ||
          mobileDigits.includes(numericQuery) ||
          phoneDigits.includes(numericQuery.replace(/^0/, '')) ||
          mobileDigits.includes(numericQuery.replace(/^0/, ''))
        );
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

  // Pagination logic - use server-side pagination when possible
  // Use real stats from database
  const stats = useMemo(() => {
    // When filtering, calculate from filtered results
    if (isFiltering && filteredCustomers.length > 0) {
      return {
        total: filteredCustomers.length,
        vip: filteredCustomers.filter(c => c.totalSpent > 1000 || c.totalVisits > 10).length,
        newThisMonth: filteredCustomers.filter(c => c.totalVisits === 0).length,
        totalRevenue: filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0)
      };
    }
    
    // Use real stats from database
    return globalStats;
  }, [filteredCustomers, globalStats, isFiltering]);
  const displayCustomers = isFiltering ? filteredCustomers : customers;
  
  const paginatedCustomers = useMemo(() => {
    if (!isFiltering) {
      // Server-side pagination - customers are already paginated
      return customers;
    }
    // Client-side pagination for filtered results
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [customers, filteredCustomers, currentPage, itemsPerPage, isFiltering]);

  const totalPages = isFiltering ? 
    Math.ceil(filteredCustomers.length / itemsPerPage) : 
    serverTotalPages;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
      
      // Left/Right arrows for pagination when not in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        if (!isFiltering) {
          loadCustomersRef.current?.({ limit: itemsPerPage, page: newPage });
        }
      }
      
      if (e.key === 'ArrowRight' && currentPage < totalPages) {
        const newPage = currentPage + 1;
        setCurrentPage(newPage);
        if (!isFiltering) {
          loadCustomersRef.current?.({ limit: itemsPerPage, page: newPage });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, currentPage, totalPages, itemsPerPage, isFiltering]);

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreateCustomerRequest = {
        firstName: formData.firstName.trim(),
        lastName: sanitizeOptionalField(formData.lastName),
        email: sanitizeOptionalField(formData.email),
        phone: sanitizeOptionalField(formData.phone),
        notes: sanitizeOptionalField(formData.notes),
      };

      const targetPage = editingCustomer ? currentPage : 1;

      if (editingCustomer) {
        await apiClient.updateCustomer(editingCustomer.id, payload);
        toast({
          title: "Success",
          description: "Customer updated successfully",
        });
      } else {
        await apiClient.createCustomer(payload);
        toast({
          title: "Success",
          description: "Customer created successfully",
        });
      }
      setIsAddDialogOpen(false);
      setEditingCustomer(null);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
      // Reload customers and stats
      setCurrentPage(targetPage);
      await loadCustomers({ limit: itemsPerPage, page: targetPage });
      setIsRemoteSearchResult(false);
      apiClient.customers.getStats()
        .then(stats => {
          if (stats) {
            setGlobalStats(stats);
          }
        })
        .catch(error => {
          console.error('Failed to refresh stats:', error);
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save customer",
        variant: "destructive",
      });
    }
  };

  // Better loading state with full skeleton
  if (loading && customers.length === 0) {
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
        {/* Search and Filters Skeleton */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        {/* Customer List Skeleton */}
        <Card>
          <div className="p-6">
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div>
                      <Skeleton className="h-5 w-16 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
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
            ref={searchInputRef}
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-24"
          />
          {isSearching && (
            <div className="absolute right-20 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground border px-2 py-1 rounded bg-muted">
            ⌘K
          </kbd>
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

      {/* Results Summary */}
      {(searchQuery || selectedSegment !== 'all') && (
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredCustomers.length} of {totalCustomers} customers
          {searchQuery && <span> matching "{searchQuery}"</span>}
          {selectedSegment !== 'all' && <span> in {selectedSegment} segment</span>}
        </div>
      )}

      {/* Customer List */}
      <Card className="overflow-hidden relative">
        {/* Loading overlay for pagination */}
        {loading && customers.length > 0 && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Loading customers...</span>
            </div>
          </div>
        )}
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
                const displayPhone = getDisplayPhone(customer);
                
                return (
                  <div key={customer.id} className="group hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between py-4 px-4 -mx-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold relative shadow-sm",
                          isVIP ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : stringToColor(customer.firstName + (customer.lastName || ''))
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
                            <p className="font-medium text-gray-900">{customer.firstName || 'Unknown'}{customer.lastName ? ` ${customer.lastName}` : ''}</p>
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
                            <span className="truncate">{customer.email || 'No email'}</span>
                            {displayPhone && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>{displayPhone}</span>
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
        
        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, isFiltering ? filteredCustomers.length : totalCustomers)} of {isFiltering ? filteredCustomers.length : totalCustomers} customers
              </p>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
                if (!isFiltering) {
                  loadCustomersRef.current?.({ limit: Number(value), page: 1 });
                }
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.currentTarget.blur();
                  const newPage = Math.max(1, currentPage - 1);
                  setCurrentPage(newPage);
                  if (!isFiltering) {
                    loadCustomersRef.current?.({ limit: itemsPerPage, page: newPage });
                  }
                }}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Page</span>
                <span className="text-sm font-medium">{currentPage}</span>
                <span className="text-sm text-muted-foreground">of {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.currentTarget.blur();
                  const newPage = Math.min(totalPages, currentPage + 1);
                  setCurrentPage(newPage);
                  if (!isFiltering) {
                    loadCustomersRef.current?.({ limit: itemsPerPage, page: newPage });
                  }
                }}
                disabled={currentPage === totalPages || loading}
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
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Optional"
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
