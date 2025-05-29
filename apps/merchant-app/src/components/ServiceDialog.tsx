'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { Switch } from '@heya-pos/ui';
import { type Service, type ServiceCategory } from '@heya-pos/shared';

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  categories: ServiceCategory[];
  onSave: (data: any) => void;
}

export function ServiceDialog({ open, onOpenChange, service, categories, onSave }: ServiceDialogProps) {
  console.log('ServiceDialog render:', { open, categoriesLength: categories.length });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Add New Service"}</DialogTitle>
          <DialogDescription>
            {service ? "Update the service details below." : "Fill in the details for the new service."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>Test dialog content</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            console.log('Save clicked');
            onOpenChange(false);
          }}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}