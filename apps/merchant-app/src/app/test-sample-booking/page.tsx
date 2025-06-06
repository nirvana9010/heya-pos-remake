'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function TestSampleBooking() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBookings({ includeAll: true });
      setBookings(data);
      console.log('Loaded bookings:', data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      booking.customerName?.toLowerCase().includes(search) ||
      booking.bookingNumber?.toLowerCase().includes(search) ||
      booking.id?.toLowerCase().includes(search)
    );
  });

  const sampleBookings = bookings.filter(booking => 
    booking.customerName?.toUpperCase().includes('SAMPLE')
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test: Finding SAMPLE NAME Booking</h1>
      
      <div className="bg-blue-50 p-4 rounded mb-4">
        <p>Total bookings loaded: {bookings.length}</p>
        <p>SAMPLE bookings found: {sampleBookings.length}</p>
      </div>

      {sampleBookings.length > 0 && (
        <div className="bg-green-50 p-4 rounded mb-4">
          <h2 className="font-bold mb-2">SAMPLE NAME Booking Found!</h2>
          {sampleBookings.map(booking => (
            <div key={booking.id} className="mb-2">
              <p>ID: {booking.id}</p>
              <p>Booking Number: {booking.bookingNumber}</p>
              <p>Customer: {booking.customerName}</p>
              <p>Date: {new Date(booking.startTime).toLocaleDateString()}</p>
              <p>Service: {booking.serviceName}</p>
              <p>Status: {booking.status}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search bookings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border px-4 py-2 rounded w-full"
        />
      </div>

      <div className="space-y-2">
        <h2 className="font-bold">All Bookings ({filteredBookings.length}):</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {filteredBookings.map(booking => (
          <div key={booking.id} className="border p-2 rounded">
            <p>{booking.bookingNumber} - {booking.customerName} - {new Date(booking.startTime).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}