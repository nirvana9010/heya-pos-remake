'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Checkbox } from '@heya-pos/ui';
import { PaymentDialogPortal } from '@/components/PaymentDialogPortal';
import { ErrorBoundary } from '@/components/error-boundary';
import { BookingSlideOut } from '@/components/BookingSlideOut';
// import { Progress } from '@heya-pos/ui'; // Progress component not available in UI package
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@heya-pos/ui';
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
import { BookingActions } from '@/components/BookingActions';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { displayFormats, toMerchantTime } from '@/lib/date-utils';
import { invalidateBookingsCache } from '@/lib/cache-config';

export default function BookingsManager() {
  
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [merchantSettings, setMerchantSettings] = useState<any>(null);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    
    // Check if we have a token before attempting to load bookings
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setLoading(false);
      return;
    }
    
    loadBookings();
    loadStaff();
    loadMerchantSettings();
    loadServices();
    loadCustomers();
    
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentBookingSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
    };
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
    // Check if redirect is in progress
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      return;
    }
    
    try {
      const staffData = await apiClient.getStaff();
      setStaff(staffData);
    } catch (error: any) {
      // Ignore auth errors as they'll be handled by the interceptor
      if (error?.message !== 'UNAUTHORIZED_REDIRECT' && error?.response?.status !== 401) {
        console.error('Failed to load staff:', error);
      }
    }
  };

  const loadMerchantSettings = async () => {
    // Check if redirect is in progress
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      return;
    }
    
    try {
      const settings = await apiClient.getMerchantSettings();
      setMerchantSettings(settings);
    } catch (error: any) {
      // Ignore auth errors as they'll be handled by the interceptor
      if (error?.message !== 'UNAUTHORIZED_REDIRECT' && error?.response?.status !== 401) {
        console.error('Failed to load merchant settings:', error);
      }
    }
  };

  const loadServices = async () => {
    // Check if redirect is in progress
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      return;
    }
    
    try {
      const servicesResponse = await apiClient.getServices();
      const servicesData = servicesResponse.data || [];
      setServices(servicesData);
    } catch (error: any) {
      // Ignore auth errors as they'll be handled by the interceptor
      if (error?.message !== 'UNAUTHORIZED_REDIRECT' && error?.response?.status !== 401) {
        console.error('Failed to load services:', error);
      }
    }
  };

  const loadCustomers = async () => {
    // Check if redirect is in progress
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      return;
    }
    
    try {
      const customersData = await apiClient.getCustomers();
      setCustomers(customersData);
    } catch (error: any) {
      // Ignore auth errors as they'll be handled by the interceptor
      if (error?.message !== 'UNAUTHORIZED_REDIRECT' && error?.response?.status !== 401) {
        console.error('Failed to load customers:', error);
      }
    }
  };

  const loadBookings = async () => {
    
    // Check if redirect is in progress
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      return;
    }
    
    try {
      setLoading(true);
      
      let params: any = {};
      if (dateFilter === 'all') {
        params.includeAll = true;
      } else if (dateFilter === 'past') {
        params.endDate = new Date().toISOString().split('T')[0];
        params.includeAll = true;
      }
      // 'upcoming' is the default behavior (today and future)
      
      const allBookings = await apiClient.getBookings(params);
      // Convert to the format expected by the component
      setBookings(allBookings as any);
    } catch (error: any) {
      // Check for redirect error
      if (error?.message === 'UNAUTHORIZED_REDIRECT') {
        return; // Don't process further
      }
      
      // Don't log 401 errors as they will trigger a redirect
      if (error?.response?.status !== 401 && error?.status !== 401) {
        toast({
          title: "Error",
          description: "Failed to load bookings. Please try again.",
          variant: "destructive",
        });
      } else {
      }
    } finally {
      // Only set loading to false if not redirecting
      if (!(window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
        setLoading(false);
      }
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowRecentSearches(false);
    
    // Save to recent searches if not empty and not already in list
    const trimmedQuery = query.trim();
    if (trimmedQuery && !recentSearches.includes(trimmedQuery)) {
      const newSearches = [trimmedQuery, ...recentSearches].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem('recentBookingSearches', JSON.stringify(newSearches));
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentBookingSearches');
  };

  const filterBookings = () => {
    const query = searchQuery.toLowerCase();
    
    const filtered = bookings.filter(booking => {
      // Search filter
      if (searchQuery && !(
        booking.customerName.toLowerCase().includes(query) ||
        booking.serviceName.toLowerCase().includes(query) ||
        booking.staffName.toLowerCase().includes(query) ||
        booking.customerPhone.includes(searchQuery) ||
        booking.id.toLowerCase().includes(query)
      )) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && booking.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Staff filter
      if (staffFilter !== 'all' && booking.staffId !== staffFilter && booking.staffName !== staffFilter) {
        return false;
      }

      // Payment filter
      if (paymentFilter !== 'all') {
        const isPaid = booking.paidAmount > 0;
        if (paymentFilter === 'paid' ? !isPaid : isPaid) {
          return false;
        }
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const bookingDate = new Date(booking.startTime || booking.date);
        if (dateRange.from && bookingDate < dateRange.from) return false;
        if (dateRange.to && bookingDate > endOfDay(dateRange.to)) return false;
      }

      return true;
    });

    setFilteredBookings(filtered);
  };

  // Quick action handlers
  const handleCheckIn = async (bookingId: string) => {
    try {
      await apiClient.startBooking(bookingId);
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
    if (selectedBookings.size === sortedBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(sortedBookings.map(b => b.id)));
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
    // Store previous state for rollback
    const previousBookings = [...bookings];
    
    // Mark this booking as processing
    setProcessingPayments(prev => new Set(prev).add(bookingId));
    
    try {
      // Optimistically update the UI immediately
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, isPaid: true, paidAmount: amount }
            : booking
        )
      );
      
      console.log(`[Mark as Paid] Starting payment process for booking ${bookingId}`);
      
      // Create order from booking if not exists
      const order = await apiClient.createOrderFromBooking(bookingId);
      console.log(`[Mark as Paid] Order created/retrieved:`, order);
      
      // Lock the order if it's in DRAFT state
      if (order.state === 'DRAFT') {
        console.log(`[Mark as Paid] Locking order ${order.id}`);
        await apiClient.updateOrderState(order.id, 'LOCKED');
      }
      
      // Quick cash payment
      console.log(`[Mark as Paid] Processing payment for ${order.balanceDue}`);
      
      // Add timeout to prevent hanging
      const paymentPromise = apiClient.processPayment({
        orderId: order.id,
        amount: order.balanceDue,
        method: 'CASH',
        metadata: {
          cashReceived: order.balanceDue,
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutError = new Error('Payment request timed out after 30 seconds');
        timeoutError.name = 'TimeoutError';
        setTimeout(() => reject(timeoutError), 30000);
      });
      
      const paymentResult = await Promise.race([paymentPromise, timeoutPromise]);
      console.log(`[Mark as Paid] Payment result:`, paymentResult);
      
      // Only update UI if component is still mounted
      if (!mountedRef.current) {
        console.log(`[Mark as Paid] Component unmounted, skipping UI updates`);
        return;
      }
      
      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded successfully.",
      });
      
      // Reload bookings after a short delay to ensure backend has updated
      setTimeout(() => {
        if (mountedRef.current) {
          console.log(`[Mark as Paid] Reloading bookings...`);
          loadBookings();
        }
      }, 1000);
    } catch (error: any) {
      // Create a proper error log with all available details
      const errorDetails = {
        message: error?.message || 'Unknown error',
        status: error?.response?.status || 'No status',
        data: error?.response?.data || null,
        code: error?.code || 'No code',
        stack: error?.stack || 'No stack trace'
      };
      
      console.error(`[Mark as Paid] Error occurred:`, errorDetails);
      console.error(`[Mark as Paid] Full error object:`, error);
      
      // Only update UI if component is still mounted
      if (mountedRef.current) {
        // Rollback on error
        setBookings(previousBookings);
        
        // Extract error message with better fallbacks
        let errorMessage = "Failed to record payment.";
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.message && error.message !== 'Network Error') {
          errorMessage = error.message;
        } else if (error?.response?.status === 404) {
          errorMessage = "Payment endpoint not found. Please contact support.";
        } else if (error?.response?.status === 500) {
          errorMessage = "Server error occurred. Please try again.";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      // Remove from processing set only if component is still mounted
      if (mountedRef.current) {
        setProcessingPayments(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookingId);
          return newSet;
        });
      }
    }
  };

  const handleProcessPayment = async (bookingId: string) => {
    // Mark this booking as processing
    setProcessingOrders(prev => new Set(prev).add(bookingId));
    
    try {
      // Use the optimized prepareOrderForPayment endpoint
      // This endpoint creates order if needed and returns all payment data in one call
      const paymentData = await apiClient.prepareOrderForPayment({
        bookingId: bookingId
      });
      
      if (!paymentData || !paymentData.order) {
        throw new Error('No order data received from payment preparation');
      }
      
      // Lock the order if it's in DRAFT state
      if (paymentData.order.state === 'DRAFT') {
        await apiClient.updateOrderState(paymentData.order.id, 'LOCKED');
        // Update the order state in the payment data
        paymentData.order.state = 'LOCKED';
      }
      
      setSelectedOrderForPayment(paymentData.order);
      setPaymentDialogOpen(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to prepare payment.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Remove from processing set
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
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

    // Calculate next available slot
    // This is simplified - in production, you'd check actual staff schedules
    const futureBookings = bookings
      .filter(b => {
        const bookingDate = new Date(b.startTime || b.date);
        return bookingDate >= now && 
               b.status?.toLowerCase() !== 'cancelled' &&
               b.status?.toLowerCase() !== 'no_show';
      })
      .sort((a, b) => {
        const dateA = new Date(a.startTime || a.date).getTime();
        const dateB = new Date(b.startTime || b.date).getTime();
        return dateA - dateB;
      });

    // Helper function to round up to next 15-minute increment
    const roundToNext15Minutes = (date: Date): Date => {
      const minutes = date.getMinutes();
      const remainder = minutes % 15;
      if (remainder === 0) return date;
      const roundedMinutes = minutes + (15 - remainder);
      const roundedDate = new Date(date);
      roundedDate.setMinutes(roundedMinutes);
      roundedDate.setSeconds(0);
      roundedDate.setMilliseconds(0);
      return roundedDate;
    };

    // Find the first gap of at least 30 minutes
    let nextAvailableTime = 'NOW';
    let nextAvailableStaff = 'Any staff';
    let nextAvailableDate: Date | null = null;
    
    if (futureBookings.length === 0) {
      // No bookings, available now
      nextAvailableTime = 'NOW';
    } else {
      // Check if there's a gap before the first booking
      const firstBooking = futureBookings[0];
      const firstBookingTime = new Date(firstBooking.startTime || firstBooking.date);
      const minutesUntilFirst = Math.floor((firstBookingTime.getTime() - now.getTime()) / 60000);
      
      if (minutesUntilFirst >= 30) {
        nextAvailableTime = 'NOW';
      } else {
        // Look for gaps between bookings
        let foundSlot = false;
        
        for (let i = 0; i < futureBookings.length - 1; i++) {
          const currentEnd = new Date(futureBookings[i].endTime || 
            new Date(futureBookings[i].startTime).getTime() + (futureBookings[i].duration || 60) * 60000);
          const nextStart = new Date(futureBookings[i + 1].startTime || futureBookings[i + 1].date);
          
          const gapMinutes = Math.floor((nextStart.getTime() - currentEnd.getTime()) / 60000);
          
          if (gapMinutes >= 30) {
            nextAvailableDate = roundToNext15Minutes(currentEnd);
            foundSlot = true;
            break;
          }
        }
        
        // If no gap found, next available is after last booking
        if (!foundSlot) {
          const lastBooking = futureBookings[futureBookings.length - 1];
          const lastEndTime = new Date(lastBooking.endTime || 
            new Date(lastBooking.startTime).getTime() + (lastBooking.duration || 60) * 60000);
          nextAvailableDate = roundToNext15Minutes(lastEndTime);
        }
        
        // Format the time
        if (nextAvailableDate) {
          // Check if it's today
          if (isSameDay(nextAvailableDate, now)) {
            nextAvailableTime = format(nextAvailableDate, 'h:mm a');
          } else if (isTomorrow(nextAvailableDate)) {
            nextAvailableTime = `Tomorrow ${format(nextAvailableDate, 'h:mm a')}`;
          } else {
            nextAvailableTime = format(nextAvailableDate, 'MMM d, h:mm a');
          }
        }
      }
    }

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
      nextAvailableTime,
      nextAvailableStaff,
      pendingCount,
      oldestPendingTime
    };
  }, [bookings]);

  // Sort bookings by creation date (newest first)
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [filteredBookings]);

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: ({ row }: any) => {
        // Use pre-formatted display date from API
        const displayDate = row.displayDate;
        const date = row.date || row.startTime;
        
        if (!displayDate && !date) return <span>-</span>;
        
        try {
          // If we have displayDate from API, use it directly
          if (displayDate) {
            return (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{displayDate}</span>
              </div>
            );
          }
          
          // Fallback to old formatting
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return <span>-</span>;
          
          return (
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{displayFormats.date(dateObj)}</span>
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
        // Use pre-formatted display time from API
        const displayStartTime = row.displayStartTime;
        
        if (!displayStartTime && !row.startTime) return <span>-</span>;
        
        try {
          // If we have displayStartTime from API, use it directly
          if (displayStartTime) {
            return (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{displayStartTime}</span>
              </div>
            );
          }
          
          // Fallback to old formatting
          const dateObj = new Date(row.startTime);
          if (isNaN(dateObj.getTime())) return <span>{row.startTime}</span>;
          
          return (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{displayFormats.time(dateObj)}</span>
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
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <Button onClick={() => setIsQuickBookingOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Quick Booking
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
              <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Next Available Slot</p>
                <p className="text-2xl font-bold">{stats.nextAvailableTime}</p>
                <p className="text-sm text-blue-600">{stats.nextAvailableStaff}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CalendarClock className="h-6 w-6 text-blue-600" />
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
            <div className="space-y-3">
              {/* Select All Header */}
              <div className="flex items-center gap-3 pb-2 border-b">
                <Checkbox
                  checked={selectedBookings.size === sortedBookings.length && sortedBookings.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({sortedBookings.length} bookings)
                </span>
              </div>
              
              {sortedBookings.map((booking) => {
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
                            selectedBookings.has(booking.id) && 'ring-2 ring-teal-500 ring-offset-2'
                          )}
                        >
                          {/* Progress bar for in-progress bookings */}
                          {booking.status?.toLowerCase() === 'in-progress' && (
                            <div className="absolute inset-x-0 top-0 h-1">
                              <div className="h-1 rounded-t-lg bg-gray-200 overflow-hidden">
                              <div 
                                className="h-full bg-teal-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
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
                                    {displayFormats.time(bookingDate)}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {displayFormats.date(bookingDate)}
                                  </span>
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
                                  {booking.services && booking.services.length > 0 ? (
                                    <div>
                                      <p className="text-gray-700">
                                        {booking.services.map(s => s.name).join(' + ')}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        with {booking.staffName || 'Staff'} • {booking.duration || 60} min
                                        {booking.services.length > 1 && ` • ${booking.services.length} services`}
                                      </p>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-gray-700">{booking.serviceName || 'Service'}</p>
                                      <p className="text-sm text-gray-500">
                                        with {booking.staffName || 'Staff'} • {booking.duration || 60} min
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-right">
                                  <PaymentStatusBadge
                                    isPaid={booking.paidAmount > 0}
                                    amount={Number(booking.totalAmount || booking.price || 0)}
                                    isCancelled={booking.status?.toLowerCase() === 'cancelled'}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <BookingActions
                                booking={{
                                  ...booking,
                                  isPaid: booking.paidAmount > 0,
                                  totalPrice: booking.totalAmount || booking.price
                                }}
                                size="sm"
                                variant="inline"
                                showEdit={false}
                                showDelete={false}
                                showPayment={booking.status?.toLowerCase() !== 'cancelled'}
                                isPaymentProcessing={processingPayments.has(booking.id)}
                                isProcessingPayment={processingOrders.has(booking.id)}
                                onStatusChange={async (bookingId, status) => {
                                  try {
                                    switch (status) {
                                      case 'in-progress':
                                        handleCheckIn(bookingId);
                                        break;
                                      case 'completed':
                                        await apiClient.completeBooking(bookingId);
                                        break;
                                      case 'cancelled':
                                        await apiClient.cancelBooking(bookingId, 'Cancelled by user');
                                        break;
                                      default:
                                        // For other statuses like 'confirmed', 'no-show', use updateBooking
                                        await apiClient.updateBooking(bookingId, { status });
                                    }
                                    await loadBookings();
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update booking status",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                onPaymentToggle={(bookingId) => handleMarkPaid(bookingId, booking.totalAmount || booking.price || 0)}
                                onProcessPayment={handleProcessPayment}
                                onReschedule={(bookingId) => router.push(`/bookings/${bookingId}/edit`)}
                                onEdit={(bookingId) => router.push(`/bookings/${bookingId}`)}
                              />
                            </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog - Using Portal to prevent parent re-renders */}
      {selectedOrderForPayment && (
        <PaymentDialogPortal
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          order={selectedOrderForPayment}
          onPaymentComplete={(updatedOrder) => {
            setSelectedOrderForPayment(null);
            loadBookings(); // Refresh bookings
          }}
          enableTips={merchantSettings?.settings?.enableTips || false}
          defaultTipPercentages={merchantSettings?.settings?.defaultTipPercentages}
        />
      )}

      {/* Booking Slideout */}
      <BookingSlideOut
        isOpen={isQuickBookingOpen}
        onClose={() => setIsQuickBookingOpen(false)}
        staff={staff}
        services={services}
        customers={customers}
        bookings={bookings}
        onSave={async (bookingData) => {
          try {
            // Booking is already created by BookingSlideOut component
            // Just handle the UI updates and cache invalidation
            invalidateBookingsCache();
            
            toast({
              title: "Booking Created",
              description: "The booking has been created successfully.",
            });
            setIsQuickBookingOpen(false);
            loadBookings(); // Refresh the bookings list
          } catch (error: any) {
            // Extract error message from the API response
            const errorMessage = error?.response?.data?.message || 
                               error?.message || 
                               "Failed to create booking. Please try again.";
            
            // Check if this is a conflict error with detailed information
            const conflicts = error?.response?.data?.conflicts;
            let description = errorMessage;
            
            if (conflicts && Array.isArray(conflicts)) {
              // Show the first conflict details
              const firstConflict = conflicts[0];
              if (firstConflict) {
                const conflictStart = new Date(firstConflict.startTime);
                const conflictTime = format(conflictStart, 'h:mm a');
                description = `${errorMessage}. There's already a booking at ${conflictTime}.`;
              }
            }
            
            toast({
              title: "Error",
              description,
              variant: "destructive",
            });
          }
        }}
      />
    </div>
    </ErrorBoundary>
  );
}