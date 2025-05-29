'use client';

import { useState } from 'react';
import { Button } from '@heya-pos/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@heya-pos/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@heya-pos/ui';

export default function TestTabsDialogPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Tabs + Dialog Interaction</h1>
      
      {/* Test 1: Button outside tabs */}
      <div className="mb-4">
        <Button onClick={() => setIsOpen(true)}>
          Open Dialog (Outside Tabs)
        </Button>
      </div>

      {/* Test 2: Tabs with button inside */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <p>Tab 1 content</p>
          <Button onClick={() => setIsOpen(true)}>
            Open Dialog (Inside Tab)
          </Button>
        </TabsContent>
        <TabsContent value="tab2">
          <p>Tab 2 content</p>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <p>Dialog opened successfully!</p>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}