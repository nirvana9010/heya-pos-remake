'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { QuickSaleSlideOut } from '@/components/QuickSaleSlideOut';

// Mock data for testing
const mockServices = [
  {
    id: '1',
    name: 'Basic Haircut',
    price: 30,
    duration: 30,
    categoryId: 'hair',
    categoryName: 'Hair Services',
    isActive: true,
    description: 'A simple haircut service'
  },
  {
    id: '2',
    name: 'Hair Color',
    price: 80,
    duration: 90,
    categoryId: 'hair',
    categoryName: 'Hair Services',
    isActive: true,
    description: 'Professional hair coloring'
  },
  {
    id: '3',
    name: 'Manicure',
    price: 45,
    duration: 45,
    categoryId: 'nails',
    categoryName: 'Nail Services',
    isActive: true,
    description: 'Classic manicure service'
  },
  {
    id: '4',
    name: 'Facial Treatment',
    price: 120,
    duration: 60,
    categoryId: 'facial',
    categoryName: 'Facial Services',
    isActive: true,
    description: 'Rejuvenating facial treatment'
  }
];

const mockStaff = [
  { id: '1', name: 'Sarah Johnson', isActive: true },
  { id: '2', name: 'Mike Chen', isActive: true },
  { id: '3', name: 'Emma Davis', isActive: true }
];

export default function QuickSaleTestPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Quick Sale Test</h1>
      <p className="mb-6 text-gray-600">
        Click the button below to test the Quick Sale slideout with the new modal pattern.
      </p>
      
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-teal-600 hover:bg-teal-700"
      >
        Open Quick Sale
      </Button>

      <QuickSaleSlideOut
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        services={mockServices}
        staff={mockStaff}
        onSaleComplete={() => {
          console.log('Sale completed!');
          setIsOpen(false);
        }}
      />

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Test Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Open Quick Sale" to open the slideout</li>
          <li>Click "Select Customer" to test the customer modal</li>
          <li>Click "Add Service" to test the service selection modal</li>
          <li>Try adjusting prices with the +/- buttons</li>
          <li>Test the order adjustment feature</li>
          <li>Verify the animations work smoothly</li>
        </ol>
        
        <div className="mt-4 text-sm text-gray-600">
          Quick Sale Slideout Status: {isOpen ? 'Open' : 'Closed'}
        </div>
      </div>
    </div>
  );
}