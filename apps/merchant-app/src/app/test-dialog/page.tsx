'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@heya-pos/ui';

export default function TestDialogPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dialog Test Page</h1>
      
      <Button onClick={() => {
        console.log('Button clicked, setting isOpen to true');
        setIsOpen(true);
      }}>
        Open Dialog
      </Button>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Dialog state: {isOpen ? 'OPEN' : 'CLOSED'}</p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>
              This is a test dialog to verify the Dialog component works.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Dialog content goes here.</p>
          </div>
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}