'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@heya-pos/ui';

export default function TestSimpleDialogPage() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Simple Dialog Test</h1>
      
      <Button onClick={() => setIsOpen(true)}>
        Open Dialog
      </Button>
      
      <p className="mt-4">Dialog state: {isOpen ? 'OPEN' : 'CLOSED'}</p>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>This is a test dialog</p>
          </div>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}