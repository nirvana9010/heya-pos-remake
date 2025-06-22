'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { ArrowLeft, Calendar, Clock, User, DollarSign, Phone, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { type Booking } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, [params.id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const bookingData = await apiClient.getBooking(params.id as string);
      setBooking(bookingData);
    } catch (error) {
      console.error('Failed to load booking:', error);
    } finally {
      setLoading(false);
    }
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiClient.updateBooking(params.id as string, { status: newStatus });
      await loadBooking();
    } catch (error) {
      console.error('Failed to update booking status:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Booking not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/bookings')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Booking Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {format(new Date(booking.date), 'MMMM dd, yyyy')}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">
                {booking.startTime} - {booking.endTime}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Total Price:</span>
              <span className="font-medium">${(booking.totalAmount || booking.price || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{booking.customerName}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{booking.customerPhone || 'Not provided'}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{booking.customerEmail || 'Not provided'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.services && booking.services.length > 0 ? (
              booking.services.map((service: any, index: number) => (
                <div key={service.id} className={index > 0 ? "border-t pt-4" : ""}>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">Service:</span>
                      <p className="font-medium">{service.name}</p>
                    </div>

                    <div className="flex space-x-4">
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <p className="font-medium">{service.duration} minutes</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Price:</span>
                        <p className="font-medium">${service.price.toFixed(2)}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-600">Staff:</span>
                      <p className="font-medium">{service.staffName}</p>
                    </div>

                    {service.category && (
                      <div>
                        <span className="text-gray-600">Category:</span>
                        <p className="font-medium">{service.category}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Fallback for old format
              <div>
                <div>
                  <span className="text-gray-600">Service:</span>
                  <p className="font-medium">{booking.serviceName}</p>
                </div>

                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-medium">{booking.duration} minutes</p>
                </div>

                <div>
                  <span className="text-gray-600">Staff:</span>
                  <p className="font-medium">{booking.staffName}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-1" />
              <p className="text-gray-600">
                {booking.notes || 'No notes for this booking'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            {booking.status === 'pending' && (
              <>
                <Button 
                  onClick={() => handleStatusChange('confirmed')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Booking
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  Cancel Booking
                </Button>
              </>
            )}
            
            {booking.status === 'confirmed' && (
              <>
                <Button 
                  onClick={() => handleStatusChange('completed')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Mark as Completed
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  Cancel Booking
                </Button>
              </>
            )}

            {booking.status === 'completed' && (
              <Button 
                variant="outline"
                onClick={() => router.push('/bookings/new')}
              >
                Book Again
              </Button>
            )}

            <Button 
              variant="outline"
              onClick={() => router.push(`/bookings/${booking.id}/edit`)}
            >
              Edit Booking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}