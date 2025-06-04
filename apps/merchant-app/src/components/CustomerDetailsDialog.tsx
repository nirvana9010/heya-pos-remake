'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import {
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Star,
  Gift,
  Crown,
  X,
  ExternalLink,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CustomerDetailsDialogProps {
  customer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function CustomerDetailsDialog({
  customer,
  open,
  onOpenChange,
  onUpdate,
}: CustomerDetailsDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.mobile || customer.phone || '',
        notes: customer.notes || '',
      });
      setIsEditing(false);
    }
  }, [customer]);

  const handleSave = async () => {
    try {
      setLoading(true);
      await apiClient.updateCustomer(customer.id, formData);
      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      });
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update customer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
    });
    setIsEditing(false);
  };

  const isVIP = (customer?.totalSpent || 0) > 1000 || (customer?.totalVisits || 0) > 10;
  const lastVisit = customer?.updatedAt ? new Date(customer.updatedAt) : null;
  const memberSince = customer?.createdAt ? formatDistanceToNow(parseISO(customer.createdAt), { addSuffix: true }) : '';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%] bg-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                isVIP ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : "bg-gradient-to-br from-purple-500 to-purple-700"
              )}>
                {customer?.firstName?.charAt(0)}{customer?.lastName?.charAt(0)}
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="h-8 w-24"
                        placeholder="First"
                      />
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="h-8 w-24"
                        placeholder="Last"
                      />
                    </div>
                  ) : (
                    <>
                      {customer?.firstName} {customer?.lastName}
                      {isVIP && <Crown className="h-4 w-4 text-yellow-600" />}
                    </>
                  )}
                </DialogPrimitive.Title>
                {!isEditing && (
                  <DialogPrimitive.Description className="text-sm text-gray-500">
                    Customer since {memberSince}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 px-6 pb-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{customer?.totalVisits || 0}</p>
              <p className="text-xs text-gray-600">Visits</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">${(customer?.totalSpent || 0).toFixed(0)}</p>
              <p className="text-xs text-gray-600">Spent</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Star className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{customer?.loyaltyPoints || 0}</p>
              <p className="text-xs text-gray-600">Points</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="px-6 pb-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Contact Information</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone"
                      className="flex-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{customer?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer?.mobile || customer?.phone}</span>
                  </div>
                  {lastVisit && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last visit {formatDistanceToNow(lastVisit, { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Notes</Label>
              {isEditing ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this customer..."
                  rows={3}
                  className="resize-none"
                />
              ) : (
                <p className="text-sm text-gray-600 min-h-[60px] p-2 bg-gray-50 rounded">
                  {customer?.notes || 'No notes yet'}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 pt-4 border-t bg-gray-50">
            <Button 
              variant="ghost" 
              onClick={() => {
                router.push(`/customers/${customer?.id}`);
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Profile
            </Button>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    Quick Edit
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}