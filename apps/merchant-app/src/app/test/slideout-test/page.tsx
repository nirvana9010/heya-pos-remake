'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { ServiceSelectionSlideout } from '@/components/ServiceSelectionSlideout';

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
  }
];

export default function SlideoutTestPage() {
  const [isServiceSlideoutOpen, setIsServiceSlideoutOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Slideout Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <p className="mb-2">Service Slideout Status: {isServiceSlideoutOpen ? 'Open' : 'Closed'}</p>
          <Button 
            onClick={() => {
              console.log('Button clicked, opening slideout');
              setIsServiceSlideoutOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Open Service Selection
          </Button>
        </div>

        {selectedService && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="font-semibold">Selected Service:</p>
            <p>{selectedService.name} - ${selectedService.price}</p>
          </div>
        )}
      </div>

      <ServiceSelectionSlideout
        isOpen={isServiceSlideoutOpen}
        onClose={() => {
          console.log('Closing slideout');
          setIsServiceSlideoutOpen(false);
        }}
        services={mockServices}
        onSelectService={(service) => {
          console.log('Service selected:', service);
          setSelectedService(service);
          setIsServiceSlideoutOpen(false);
        }}
      />
    </div>
  );
}