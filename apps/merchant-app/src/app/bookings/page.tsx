'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { DataTable } from '@heya-pos/ui';
import { Plus, Search, Calendar, Clock, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { type Booking } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const allBookings = await apiClient.getBookings();
      // Convert to the format expected by the component
      setBookings(allBookings as any);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.staffName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{format(new Date(row.date), 'MMM dd, yyyy')}</span>
        </div>
      )
    },
    {
      header: 'Time',
      accessor: 'startTime',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>{row.startTime}</span>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: 'customerName',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.customerName}</span>
        </div>
      )
    },
    {
      header: 'Service',
      accessor: 'serviceName',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.serviceName}</p>
          <p className="text-sm text-gray-500">{row.duration} min</p>
        </div>
      )
    },
    {
      header: 'Staff',
      accessor: 'staffName'
    },
    {
      header: 'Price',
      accessor: 'price',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-1">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span>${row.price.toFixed(2)}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ row }: any) => (
        <Badge className={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      )
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
          {row.status === 'pending' && (
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