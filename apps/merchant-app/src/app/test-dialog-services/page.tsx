'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@heya-pos/ui';

export default function TestDialogServicesPage() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    console.log('TestDialogServicesPage mounted');
  }, []);
  
  useEffect(() => {
    console.log('Dialog state changed:', isOpen);
  }, [isOpen]);

  const handleButtonClick = () => {
    console.log('Button clicked!');
    console.log('Current state before:', isOpen);
    setIsOpen(true);
    console.log('Called setIsOpen(true)');
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Test Dialog (Services Style)</h1>
      
      <div className="space-y-2">
        <p>Current dialog state: <strong>{isOpen ? 'OPEN' : 'CLOSED'}</strong></p>
        
        <Button 
          onClick={handleButtonClick}
          className="bg-primary hover:bg-primary/90"
        >
          Open Dialog (UI Button)
        </Button>
        
        <button 
          onClick={handleButtonClick}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Open Dialog (Native Button)
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>
              If you can see this, the Dialog component is working!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Dialog is now open.</p>
          </div>
          <Button onClick={() => setIsOpen(false)}>
            Close Dialog
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}