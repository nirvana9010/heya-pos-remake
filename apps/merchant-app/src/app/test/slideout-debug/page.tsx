'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';

export default function SlideoutDebugPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Slideout Debug Test</h1>
      
      <Button 
        onClick={() => {
          console.log('Opening slideout');
          setIsOpen(true);
        }}
        className="bg-teal-600 hover:bg-teal-700"
      >
        Open Test Slideout
      </Button>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Slideout state: {isOpen ? 'Open' : 'Closed'}</p>
      </div>

      {/* Simple test slideout */}
      <>
        {/* Backdrop */}
        <div 
          className={cn(
            "fixed inset-0 bg-gray-900 transition-opacity z-50",
            isOpen ? "bg-opacity-50" : "bg-opacity-0 pointer-events-none"
          )}
          onClick={() => {
            console.log('Backdrop clicked');
            setIsOpen(false);
          }}
        />
        
        {/* Slideout */}
        <div className={cn(
          "fixed inset-y-0 right-0 flex max-w-full transform transition-transform duration-300 ease-in-out z-[60]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="relative w-screen max-w-md bg-white shadow-2xl">
            <div className="h-full p-6">
              <h2 className="text-xl font-bold mb-4">Test Slideout</h2>
              <p>This is a minimal slideout to test if the animation works.</p>
              <Button 
                onClick={() => {
                  console.log('Close button clicked');
                  setIsOpen(false);
                }}
                className="mt-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}