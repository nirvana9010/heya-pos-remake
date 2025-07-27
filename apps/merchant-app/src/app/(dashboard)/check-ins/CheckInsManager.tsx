'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { ErrorBoundary } from '@/components/error-boundary';
import { 
  Search, 
  Calendar, 
  User, 
  Phone,
  Check,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { 
  format, 
  isToday,
  startOfDay,
  parseISO
} from 'date-fns';
import { type Booking } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';
import { invalidateBookingsCache } from '@/lib/cache-config';

export default function CheckInsManager() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingBookings, setProcessingBookings] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const mountedRef = useRef(true);
  const previousBookingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('No access token found');
      router.push('/login');
      return;
    }

    loadBookings();
    // Poll every 5 seconds for new check-ins
    const interval = setInterval(loadBookings, 5000); // Refresh every 5 seconds

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery]);

  const loadBookings = async () => {
    if ((window as any).__AUTH_REDIRECT_IN_PROGRESS__) {
      return;
    }
    
    try {
      setLoading(true);
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log('[CheckIns] Loading bookings for date range:', {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        localTime: today.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: today.getTimezoneOffset()
      });
      
      // Fetch today's bookings - include ALL statuses
      const params = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        // Don't filter by status - we want to see all bookings including COMPLETED ones
      };
      
      console.log('[CheckIns] Fetching with params:', params);
      const bookingsData = await apiClient.getBookings(params);
      
      console.log('[CheckIns] Raw bookings data received:', bookingsData);
      console.log('[CheckIns] Number of bookings:', bookingsData?.length || 0);
      
      if (bookingsData && bookingsData.length > 0) {
        console.log('[CheckIns] First booking details:', {
          id: bookingsData[0].id,
          status: bookingsData[0].status,
          startTime: bookingsData[0].startTime,
          customerName: bookingsData[0].customerName,
          date: bookingsData[0].date
        });
      }
      
      if (!mountedRef.current) return;
      
      // Check for new check-ins
      const newBookings = bookingsData || [];
      const currentIds = new Set(newBookings.map(b => b.id));
      const newCheckIns = newBookings.filter(b => !previousBookingIds.current.has(b.id));
      
      console.log('[CheckIns] New check-ins detected:', newCheckIns.length);
      
      // Show toast for new check-ins (only after initial load)
      if (!loading && newCheckIns.length > 0) {
        newCheckIns.forEach(booking => {
          toast({
            title: 'New Check-In!',
            description: `${booking.customerName} has checked in`,
          });
        });
      }
      
      previousBookingIds.current = currentIds;
      setBookings(newBookings);
      setLastUpdated(new Date());
    } catch (error: any) {
      if (error?.message !== 'UNAUTHORIZED_REDIRECT' && error?.response?.status !== 401) {
        console.error('[CheckIns] Failed to load bookings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load bookings',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    const query = searchQuery.toLowerCase();
    
    console.log('[CheckIns] Filtering bookings:', {
      totalBookings: bookings.length,
      searchQuery: searchQuery
    });
    
    const filtered = bookings.filter(booking => {
      // Search filter - only customer name and phone
      if (searchQuery && !(
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerPhone.includes(searchQuery)
      )) {
        return false;
      }

      return true;
    });

    console.log('[CheckIns] Filtered bookings:', filtered.length);
    setFilteredBookings(filtered);
  };

  const handleComplete = async (bookingId: string) => {
    setProcessingBookings(prev => new Set(prev).add(bookingId));
    
    try {
      // Mark as completed and paid
      await apiClient.updateBooking(bookingId, { 
        status: 'completed',
        paidAmount: bookings.find(b => b.id === bookingId)?.totalAmount || 0
      });
      
      toast({
        title: 'Success',
        description: 'Check-in completed',
      });
      
      invalidateBookingsCache();
      await loadBookings();
    } catch (error) {
      console.error('Failed to complete booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete check-in',
        variant: 'destructive',
      });
    } finally {
      setProcessingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setProcessingBookings(prev => new Set(prev).add(bookingId));
    
    try {
      await apiClient.updateBooking(bookingId, { status: 'cancelled' });
      
      toast({
        title: 'Success',
        description: 'Booking cancelled',
      });
      
      invalidateBookingsCache();
      await loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    } finally {
      setProcessingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const timeA = new Date(a.startTime || a.date).getTime();
      const timeB = new Date(b.startTime || b.date).getTime();
      return timeA - timeB; // Ascending order (earliest first)
    });
  }, [filteredBookings]);

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Check-In</h1>
          <div className="flex items-center gap-3">
            {/* Debug button - remove after testing */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log('[CheckIns] Manual refresh triggered');
                  await loadBookings();
                }}
              >
                Refresh Now
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4" />
              <span>Updates every 5 seconds</span>
            </div>
            <Badge variant="outline">
              {format(new Date(), 'EEEE, MMMM d')}
            </Badge>
          </div>
        </div>

        {/* Simple Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Today's Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Check-ins ({sortedBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No check-ins found for today
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBookings.map((booking) => {
                  const isProcessing = processingBookings.has(booking.id);
                  const checkInTime = booking.startTime ? 
                    format(parseISO(booking.startTime), 'h:mm a') : 
                    'Walk-in';
                  
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      {/* Customer Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{booking.customerName}</span>
                          </div>
                          {booking.customerPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{booking.customerPhone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{checkInTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {booking.status === 'completed' ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-4 w-4 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleComplete(booking.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Complete
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(booking.id)}
                          disabled={isProcessing || booking.status === 'cancelled' || booking.status === 'completed'}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}