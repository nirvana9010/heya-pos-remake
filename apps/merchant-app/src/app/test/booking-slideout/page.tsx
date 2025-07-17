'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { BookingSlideOut } from '@/components/BookingSlideOut';
import { AuthProvider } from '@/lib/auth/auth-provider';

// Mock data for testing
const mockStaff = [
  { id: '1', name: 'John Doe', color: '#4CAF50' },
  { id: '2', name: 'Jane Smith', color: '#2196F3' },
  { id: '3', name: 'Bob Johnson', color: '#FF9800' },
];

const mockServices = [
  { id: '1', name: 'Haircut', price: 50, duration: 30, categoryName: 'Hair' },
  { id: '2', name: 'Hair Color', price: 120, duration: 90, categoryName: 'Hair' },
  { id: '3', name: 'Manicure', price: 40, duration: 45, categoryName: 'Nails' },
  { id: '4', name: 'Facial', price: 80, duration: 60, categoryName: 'Skin' },
];

const mockCustomers = [
  { id: '1', name: 'Alice Brown', phone: '0412345678', email: 'alice@example.com' },
  { id: '2', name: 'Charlie Davis', phone: '0423456789', email: 'charlie@example.com' },
];

export default function BookingSlideOutTestPage() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = (booking: any) => {
    console.log('Booking saved:', booking);
    // In real app, this would call API
  };

  return (
    <AuthProvider>
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Booking SlideOut Test</h1>
        
        <Button 
          onClick={() => setIsOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          Open Booking SlideOut
        </Button>

        <BookingSlideOut
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          staff={mockStaff}
          services={mockServices}
          customers={mockCustomers}
          bookings={[]}
          onSave={handleSave}
          merchant={{
            settings: {
              allowWalkInBookings: true,
              allowUnassignedBookings: false,
              enableTips: true
            },
            locations: [{ id: 'loc1', name: 'Main Location' }]
          }}
        />
      </div>
    </AuthProvider>
  );
}