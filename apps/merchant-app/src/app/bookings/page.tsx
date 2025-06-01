'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Plus, Search, Calendar, Clock, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
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
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      loadBookings();
    }
  }, [dateFilter]);

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

  const filterBookings = () => {
    let filtered = [...bookings];

    if (searchQuery) {
      filtered = filtered.filter(booking =>
        (booking.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.serviceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.staffName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => 
        booking.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredBookings(filtered);
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

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="all">All Bookings</SelectItem>
                <SelectItem value="past">Past Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th
                        key={column.header}
                        className="text-left py-3 px-4 font-medium text-gray-700"
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="border-b hover:bg-gray-50">
                      {columns.map((column) => (
                        <td key={column.header} className="py-3 px-4">
                          {column.cell ? column.cell({ row: booking }) : (booking as any)[column.accessor || '']}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}