'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Checkbox } from '@heya-pos/ui';
import { Progress } from '@heya-pos/ui';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@heya-pos/ui';
import { DatePickerWithRange } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  Mail,
  MessageSquare,
  CreditCard,
  CalendarClock,
  MoreVertical,
  Check,
  AlertTriangle,
  Loader2,
  Download,
  Send
} from 'lucide-react';
import { 
  format, 
  isToday, 
  isTomorrow, 
  isThisWeek, 
  startOfDay, 
  endOfDay,
  addHours,
  isSameDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { type Booking } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';

export default function BookingsPage() {
  console.log('[BookingsPage] Component rendering...');
  
  const router = useRouter();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  useEffect(() => {
    console.log('[BookingsPage] useEffect triggered');
    
    // Check if we have a token before attempting to load bookings
    const token = localStorage.getItem('access_token');
    console.log('[BookingsPage] Token exists:', !!token);
    
    if (!token) {
      console.log('[BookingsPage] No token, skipping loadBookings call');
      setLoading(false);
      return;
    }
    
    console.log('[BookingsPage] Token found, calling loadBookings...');
    loadBookings();
    loadStaff();
    
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentBookingSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter, staffFilter, paymentFilter, dateRange]);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      loadBookings();
    }
  }, [dateFilter]);

  const loadStaff = async () => {
    try {
      const staffData = await apiClient.getStaff();
      setStaff(staffData);
    } catch (error) {
      console.error('Failed to load staff:', error);
    }
  };

  const loadBookings = async () => {
    console.log('[BookingsPage] loadBookings called with dateFilter:', dateFilter);
    try {
      setLoading(true);
      console.log('[BookingsPage] Calling apiClient.getBookings()...');
      
      let params: any = {};
      if (dateFilter === 'all') {
        params.includeAll = true;
      } else if (dateFilter === 'past') {
        params.endDate = new Date().toISOString().split('T')[0];
        params.includeAll = true;
      }
      // 'upcoming' is the default behavior (today and future)
      
      const allBookings = await apiClient.getBookings(params);
      console.log('[BookingsPage] Bookings loaded successfully:', allBookings);
      // Convert to the format expected by the component
      setBookings(allBookings as any);
    } catch (error: any) {
      console.log('[BookingsPage] Error caught in loadBookings:', {
        status: error?.response?.status,
        message: error?.message,
        fullError: error
      });
      
      // Check for redirect error
      if (error?.message === 'UNAUTHORIZED_REDIRECT') {
        console.log('[BookingsPage] Unauthorized redirect in progress...');
        return; // Don't process further
      }
      
      // Don't log 401 errors as they will trigger a redirect
      if (error?.response?.status !== 401) {
        console.error('[BookingsPage] Non-401 error, showing toast...');
        toast({
          title: "Error",
          description: "Failed to load bookings. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('[BookingsPage] 401 error caught, should be redirecting...');
      }
    } finally {
      console.log('[BookingsPage] Setting loading to false');
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowRecentSearches(false);
    
    // Save to recent searches if not empty and not already in list
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const newSearches = [query.trim(), ...recentSearches].slice(0, 5); // Keep last 5
      setRecentSearches(newSearches);
      localStorage.setItem('recentBookingSearches', JSON.stringify(newSearches));
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentBookingSearches');
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        (booking.customerName || '').toLowerCase().includes(query) ||
        (booking.serviceName || '').toLowerCase().includes(query) ||
        (booking.staffName || '').toLowerCase().includes(query) ||
        (booking.customerPhone || '').includes(searchQuery) ||
        (booking.id || '').toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => 
        booking.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (staffFilter !== 'all') {
      filtered = filtered.filter(booking => 
        booking.staffId === staffFilter || booking.staffName === staffFilter
      );
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const isPaid = (booking.paidAmount || 0) > 0;
        return paymentFilter === 'paid' ? isPaid : !isPaid;
      });
    }

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.startTime || booking.date);
        if (dateRange.from && bookingDate < dateRange.from) return false;
        if (dateRange.to && bookingDate > endOfDay(dateRange.to)) return false;
        return true;
      });
    }

    setFilteredBookings(filtered);
  };

  // Quick action handlers
  const handleCheckIn = async (bookingId: string) => {
    try {
      await apiClient.updateBookingStatus(bookingId, 'IN_PROGRESS');
      toast({
        title: "Checked In",
        description: "Customer has been checked in successfully.",
      });
      loadBookings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check in customer.",
        variant: "destructive",
      });
    }
  };

  const handleSendReminder = async (booking: Booking) => {
    try {
      // This would integrate with SMS/Email service
      toast({
        title: "Reminder Sent",
        description: `Reminder sent to ${booking.customerName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder.",
        variant: "destructive",
      });
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedBookings.size === filteredBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(filteredBookings.map(b => b.id)));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleBulkSendReminders = async () => {
    setBulkActionLoading(true);
    try {
      const selectedBookingsList = bookings.filter(b => selectedBookings.has(b.id));
      
      // In real implementation, this would batch send reminders
      for (const booking of selectedBookingsList) {
        if (booking.customerPhone || booking.customerEmail) {
          await handleSendReminder(booking);
        }
      }
      
      toast({
        title: "Reminders Sent",
        description: `Sent reminders to ${selectedBookingsList.length} customers`,
      });
      setSelectedBookings(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send some reminders",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportSelected = () => {
    const selectedBookingsList = bookings.filter(b => selectedBookings.has(b.id));
    
    // Create CSV content
    const headers = ['Date', 'Time', 'Customer', 'Service', 'Staff', 'Status', 'Price', 'Paid'];
    const rows = selectedBookingsList.map(booking => {
      const date = new Date(booking.startTime || booking.date);
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm'),
        booking.customerName || '',
        booking.serviceName || '',
        booking.staffName || '',
        booking.status || '',
        booking.totalAmount || booking.price || 0,
        booking.paidAmount > 0 ? 'Yes' : 'No'
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast({
      title: "Export Complete",
      description: `Exported ${selectedBookingsList.length} bookings`,
    });
  };

  const handleMarkPaid = async (bookingId: string, amount: number) => {
    try {
      await apiClient.processPayment({
        bookingId,
        amount,
        method: 'CASH',
        status: 'COMPLETED'
      });
      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded successfully.",
      });
      loadBookings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      });
    }
  };

  // Helper to calculate progress for in-progress bookings
  const getBookingProgress = (booking: Booking) => {
    if (booking.status?.toLowerCase() !== 'in-progress') return 0;
    
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.round((elapsed / totalDuration) * 100);
  };

  const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    switch (lowerStatus) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const next2Hours = addHours(now, 2);
    const next3Hours = addHours(now, 3);

    const todayBookings = bookings.filter(b => {
      const bookingDate = new Date(b.startTime || b.date);
      return bookingDate >= todayStart && bookingDate <= todayEnd;
    });

    const todayCompleted = todayBookings.filter(b => 
      b.status?.toLowerCase() === 'completed'
    ).length;

    const upcomingIn2Hours = bookings.filter(b => {
      const bookingDate = new Date(b.startTime || b.date);
      return bookingDate >= now && bookingDate <= next2Hours && 
             b.status?.toLowerCase() !== 'cancelled' && 
             b.status?.toLowerCase() !== 'completed';
    });

    // Calculate available slots in next 3 hours
    // This is a simplified calculation - in reality you'd check against actual availability
    const bookingsNext3Hours = bookings.filter(b => {
      const bookingDate = new Date(b.startTime || b.date);
      return bookingDate >= now && bookingDate <= next3Hours && 
             b.status?.toLowerCase() !== 'cancelled';
    });
    
    // Assume 30 min slots, 4 staff members working
    const totalPossibleSlots = 6 * 4; // 6 half-hour slots * 4 staff
    const availableSlots = Math.max(0, totalPossibleSlots - bookingsNext3Hours.length);

    // Calculate pending confirmations
    const pendingBookings = bookings.filter(b => {
      const bookingDate = new Date(b.startTime || b.date);
      return b.status?.toLowerCase() === 'pending' && 
             bookingDate >= now; // Only future pending bookings
    });
    
    const pendingCount = pendingBookings.length;
    
    // Find oldest pending booking
    let oldestPendingTime = 'None pending';
    if (pendingBookings.length > 0) {
      const sortedPending = pendingBookings.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date).getTime();
        const dateB = new Date(b.createdAt || b.date).getTime();
        return dateA - dateB;
      });
      
      const oldest = sortedPending[0];
      if (oldest.createdAt) {
        const hoursAgo = Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60));
        if (hoursAgo >= 24) {
          oldestPendingTime = `${Math.floor(hoursAgo / 24)}d old`;
        } else if (hoursAgo > 0) {
          oldestPendingTime = `${hoursAgo}h old`;
        } else {
          const minsAgo = Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / (1000 * 60));
          oldestPendingTime = `${minsAgo}m old`;
        }
      }
    }

    return {
      todayCount: todayBookings.length,
      todayCompleted,
      upcomingCount: upcomingIn2Hours.length,
      availableSlots,
      pendingCount,
      oldestPendingTime
    };
  }, [bookings]);

  // Group bookings by date
  const groupedBookings = useMemo(() => {
    const groups: { [key: string]: Booking[] } = {};
    
    filteredBookings.forEach(booking => {
      const date = new Date(booking.startTime || booking.date);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isTomorrow(date)) {
        groupKey = 'Tomorrow';
      } else if (isThisWeek(date)) {
        groupKey = 'This Week';
      } else {
        groupKey = format(date, 'MMMM yyyy');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(booking);
    });

    // Sort bookings within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = new Date(a.startTime || a.date).getTime();
        const dateB = new Date(b.startTime || b.date).getTime();
        return dateA - dateB;
      });
    });

    return groups;
  }, [filteredBookings]);

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: ({ row }: any) => {
        const date = row.date || row.startTime;
        if (!date) return <span>-</span>;
        
        try {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return <span>-</span>;
          
          return (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{format(dateObj, 'MMM dd, yyyy')}</span>
            </div>
          );
        } catch (error) {
          return <span>-</span>;
        }
      }
    },
    {
      header: 'Time',
      accessor: 'startTime',
      cell: ({ row }: any) => {
        if (!row.startTime) return <span>-</span>;
        
        try {
          const dateObj = new Date(row.startTime);
          if (isNaN(dateObj.getTime())) return <span>{row.startTime}</span>;
          
          return (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{format(dateObj, 'h:mm a')}</span>
            </div>
          );
        } catch (error) {
          return <span>{row.startTime}</span>;
        }
      }
    },
    {
      header: 'Customer',
      accessor: 'customerName',
      cell: ({ row }: any) => {
        const customerName = row.customerName || 'Unknown Customer';
        return (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{customerName}</span>
          </div>
        );
      }
    },
    {
      header: 'Service',
      accessor: 'serviceName',
      cell: ({ row }: any) => {
        const serviceName = row.serviceName || 'Service';
        const duration = row.duration || 0;
        return (
          <div>
            <p className="font-medium">{serviceName}</p>
            {duration > 0 && <p className="text-sm text-gray-500">{duration} min</p>}
          </div>
        );
      }
    },
    {
      header: 'Staff',
      accessor: 'staffName',
      cell: ({ row }: any) => {
        const staffName = row.staffName || 'Staff';
        return <span>{staffName}</span>;
      }
    },
    {
      header: 'Price',
      accessor: 'price',
      cell: ({ row }: any) => {
        const amount = row.totalAmount || row.price || 0;
        return (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span>${amount.toFixed(2)}</span>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ row }: any) => {
        const displayStatus = (row.status || '').toLowerCase().replace('_', ' ');
        return (
          <Badge className={getStatusColor(row.status)}>
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </Badge>
        );
      }
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/bookings/${row.id}`)}
          >
            View
          </Button>
          {row.status?.toLowerCase() === 'pending' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {/* TODO: Confirm booking */}}
            >
              Confirm
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <Button onClick={() => router.push('/bookings/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
                <p className="text-sm text-gray-500">{stats.todayCompleted} completed</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Walk-ins Available</p>
                <p className="text-2xl font-bold">{stats.availableSlots}</p>
                <p className="text-sm text-blue-600">next 3 hours</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Next 2 Hours</p>
                <p className="text-2xl font-bold">{stats.upcomingCount}</p>
                <p className="text-sm text-orange-600">upcoming</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Confirmations</p>
                <p className="text-2xl font-bold">{stats.pendingCount}</p>
                <p className="text-sm text-yellow-600">{stats.oldestPendingTime}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                stats.pendingCount > 3 ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                <AlertCircle className={`h-6 w-6 ${stats.pendingCount > 3 ? 'text-yellow-600' : 'text-green-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>All Bookings</CardTitle>
            {selectedBookings.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedBookings.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkSendReminders}
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Send Reminders
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportSelected}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedBookings(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {/* Search and primary filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, service, phone, or booking ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowRecentSearches(true)}
                  onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  className="pl-10"
                />
                
                {/* Recent searches dropdown */}
                {showRecentSearches && recentSearches.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1 mb-1">
                        <span className="text-xs font-medium text-gray-500">Recent searches</span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Clear
                        </button>
                      </div>
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(search)}
                          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Clock className="h-3 w-3 text-gray-400" />
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Secondary filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[180px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[150px]">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="past">Past Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Date range picker would go here - using placeholder for now */}
              <Button
                variant="outline"
                onClick={() => {
                  // Reset all filters
                  setSearchQuery('');
                  setStatusFilter('all');
                  setStaffFilter('all');
                  setPaymentFilter('all');
                  setDateFilter('upcoming');
                  setDateRange({ from: undefined, to: undefined });
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No bookings found
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBookings).map(([groupName, groupBookings]) => {
                const groupBookingIds = groupBookings.map(b => b.id);
                const groupSelected = groupBookingIds.filter(id => selectedBookings.has(id));
                const isGroupFullySelected = groupSelected.length === groupBookings.length && groupBookings.length > 0;
                const isGroupPartiallySelected = groupSelected.length > 0 && groupSelected.length < groupBookings.length;
                
                return (
                  <div key={groupName}>
                    {/* Group Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        checked={isGroupFullySelected}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedBookings);
                          if (isGroupFullySelected) {
                            groupBookingIds.forEach(id => newSelected.delete(id));
                          } else {
                            groupBookingIds.forEach(id => newSelected.add(id));
                          }
                          setSelectedBookings(newSelected);
                        }}
                      />
                      <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                      <Badge variant="secondary">{groupBookings.length}</Badge>
                      {groupName === 'Today' && (
                        <span className="text-sm text-gray-500">
                          ${groupBookings
                            .filter(b => b.status?.toLowerCase() !== 'cancelled' && b.status?.toLowerCase() !== 'no_show')
                            .reduce((sum, b) => sum + (b.totalAmount || b.price || 0), 0)
                            .toFixed(2)}
                        </span>
                      )}
                    </div>

                  {/* Bookings in group */}
                  <div className="space-y-3">
                    {groupBookings.map((booking) => {
                      const bookingDate = new Date(booking.startTime || booking.date);
                      const isPast = bookingDate < new Date();
                      const isUpcoming = !isPast && booking.status?.toLowerCase() !== 'completed' && booking.status?.toLowerCase() !== 'cancelled';
                      const progress = getBookingProgress(booking);
                      const timeUntil = bookingDate.getTime() - new Date().getTime();
                      const isStartingSoon = isUpcoming && timeUntil < 1800000; // 30 minutes
                      const isStartingVerySoon = isUpcoming && timeUntil < 900000; // 15 minutes
                      
                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "bg-white border rounded-lg p-4 hover:shadow-md transition-shadow relative",
                            isPast && 'opacity-75',
                            booking.status?.toLowerCase() === 'cancelled' && 'opacity-60',
                            isStartingVerySoon && 'border-orange-400 border-2',
                            selectedBookings.has(booking.id) && 'ring-2 ring-purple-500 ring-offset-2'
                          )}
                        >
                          {/* Progress bar for in-progress bookings */}
                          {booking.status?.toLowerCase() === 'in-progress' && (
                            <div className="absolute inset-x-0 top-0 h-1">
                              <Progress value={progress} className="h-1 rounded-t-lg" />
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedBookings.has(booking.id)}
                              onCheckedChange={() => handleSelectBooking(booking.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/bookings/${booking.id}`)}>
                              <div className="flex items-center gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">
                                    {format(bookingDate, 'h:mm a')}
                                  </span>
                                  {!isToday(bookingDate) && (
                                    <span className="text-sm text-gray-500">
                                      {format(bookingDate, 'MMM d')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(booking.status || '')}>
                                    {booking.status?.toLowerCase() === 'in-progress' && (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    )}
                                    {(booking.status || '').toLowerCase().replace('_', ' ')}
                                  </Badge>
                                  {isStartingVerySoon && (
                                    <Badge variant="outline" className="border-orange-500 text-orange-600 animate-pulse">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {Math.round(timeUntil / 60000)} min
                                    </Badge>
                                  )}
                                  {isStartingSoon && !isStartingVerySoon && (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                      Starting soon
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{booking.customerName || 'Unknown'}</span>
                                </div>
                                
                                <div className="md:col-span-2">
                                  <p className="text-gray-700">{booking.serviceName || 'Service'}</p>
                                  <p className="text-sm text-gray-500">
                                    with {booking.staffName || 'Staff'} • {booking.duration || 60} min
                                  </p>
                                </div>
                                
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {booking.paidAmount > 0 ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <DollarSign className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className={cn(
                                      "font-medium",
                                      booking.paidAmount > 0 && "text-green-600"
                                    )}>
                                      ${(booking.totalAmount || booking.price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  {booking.paidAmount > 0 && (
                                    <span className="text-xs text-green-600">Paid</span>
                                  )}
                                  {!booking.paidAmount && booking.status?.toLowerCase() !== 'cancelled' && (
                                    <span className="text-xs text-orange-600">Unpaid</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="flex items-center gap-2">
                              {/* Quick action buttons for common actions */}
                              {booking.status?.toLowerCase() === 'confirmed' && isUpcoming && (
                                <>
                                  {(bookingDate.getTime() - new Date().getTime()) < 3600000 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCheckIn(booking.id);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Check In
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendReminder(booking);
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              
                              {!(booking.paidAmount > 0) && booking.status?.toLowerCase() !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkPaid(booking.id, booking.totalAmount || booking.price || 0);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* More actions dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/bookings/${booking.id}`)}>
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/bookings/${booking.id}/edit`)}>
                                    <CalendarClock className="h-4 w-4 mr-2" />
                                    Reschedule
                                  </DropdownMenuItem>
                                  {booking.customerPhone && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleSendReminder(booking)}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Send SMS Reminder
                                      </DropdownMenuItem>
                                      {booking.customerEmail && (
                                        <DropdownMenuItem onClick={() => handleSendReminder(booking)}>
                                          <Mail className="h-4 w-4 mr-2" />
                                          Send Email Reminder
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                  {booking.status?.toLowerCase() === 'confirmed' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleCheckIn(booking.id)}
                                        className="text-green-600"
                                      >
                                        <Check className="h-4 w-4 mr-2" />
                                        Check In
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {!(booking.paidAmount > 0) && booking.status?.toLowerCase() !== 'cancelled' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleMarkPaid(booking.id, booking.totalAmount || booking.price || 0)}
                                      >
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}