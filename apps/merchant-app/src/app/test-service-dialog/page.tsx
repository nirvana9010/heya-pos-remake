'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { ServiceDialog } from '@/components/ServiceDialog';

export default function TestServiceDialogPage() {
  const [isOpen, setIsOpen] = useState(false);
  
  console.log('TestServiceDialogPage render, isOpen:', isOpen);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">ServiceDialog Test</h1>
      
      <Button 
        onClick={() => {
          console.log('Button clicked, setting isOpen to true');
          setIsOpen(true);
        }}
      >
        Open ServiceDialog
      </Button>
      
      <p className="mt-4">Dialog open state: {isOpen ? 'true' : 'false'}</p>
      
      <ServiceDialog
        open={isOpen}
        onOpenChange={(open) => {
          console.log('ServiceDialog onOpenChange called with:', open);
          setIsOpen(open);
        }}
        service={null}
        categories={[
          { id: '1', name: 'Hair', merchantId: '123', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', name: 'Nails', merchantId: '123', createdAt: new Date(), updatedAt: new Date() }
        ]}
        onSave={(data) => {
          console.log('Save called with:', data);
          setIsOpen(false);
        }}
      />
    </div>
  );
}