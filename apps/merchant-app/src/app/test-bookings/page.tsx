'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';

export default function TestBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we have a token
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found. Please login first.');
        return;
      }

      const data = await apiClient.getBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Bookings Display</h1>
      
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      {!loading && !error && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Found {bookings.length} bookings</p>
          
          {bookings.map((booking, index) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle className="text-lg">Booking #{index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Customer Name:</p>
                    <p>{booking.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Service Name:</p>
                    <p>{booking.serviceName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Staff Name:</p>
                    <p>{booking.staffName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Total Amount:</p>
                    <p>${booking.totalAmount || 0}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Status:</p>
                    <p>{booking.status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Raw Data Check:</p>
                    <p className="text-xs">
                      Customer: {booking.customer ? 'Object exists' : 'Missing'}<br/>
                      Provider: {booking.provider ? 'Object exists' : 'Missing'}<br/>
                      Services: {booking.services ? `Array(${booking.services.length})` : 'Missing'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}