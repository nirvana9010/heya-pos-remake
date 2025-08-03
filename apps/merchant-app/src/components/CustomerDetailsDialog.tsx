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
import { formatName, formatInitials } from '@heya-pos/utils';
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
import { safeCustomerFormData, safeLoyaltyFormData } from '@/lib/utils/form-utils';

interface CustomerProps {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  notes?: string | null;
  totalSpent: number;
  totalVisits: number;
  loyaltyPoints: number;
  loyaltyVisits?: number;
  createdAt: string;
  updatedAt?: string;
}

interface CustomerDetailsDialogProps {
  customer: CustomerProps;
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
  const [showHistory, setShowHistory] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyDateRange, setHistoryDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days future
  });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });
  
  const [loyaltyData, setLoyaltyData] = useState({
    loyaltyVisits: 0,
    loyaltyPoints: 0,
  });

  useEffect(() => {
    if (customer) {
      setFormData(safeCustomerFormData(customer));
      setLoyaltyData(safeLoyaltyFormData(customer));
      setIsEditing(false);
    }
  }, [customer]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Prepare data for API - don't send empty lastName
      const updateData: any = {
        firstName: formData.firstName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        notes: formData.notes || undefined,
      };
      
      // Only include lastName if it has a value
      if (formData.lastName && formData.lastName.trim()) {
        updateData.lastName = formData.lastName;
      }
      
      // Update customer basic info
      console.log('Updating customer with data:', updateData);
      const updateResult = await apiClient.updateCustomer(customer.id, updateData);
      console.log('Customer update result:', updateResult);
      
      // Check if loyalty data has changed
      const loyaltyChanged = 
        loyaltyData.loyaltyVisits !== (customer.loyaltyVisits || 0) ||
        loyaltyData.loyaltyPoints !== (customer.loyaltyPoints || 0);
      
      if (loyaltyChanged) {
        // Calculate the adjustments
        const visitAdjustment = loyaltyData.loyaltyVisits - (customer.loyaltyVisits || 0);
        const pointAdjustment = loyaltyData.loyaltyPoints - (customer.loyaltyPoints || 0);
        
        // Call loyalty adjustment endpoint
        const adjustmentData: any = {
          reason: 'Manual adjustment from customer profile'
        };
        
        if (visitAdjustment !== 0) {
          adjustmentData.visits = visitAdjustment;
        }
        
        if (pointAdjustment !== 0) {
          adjustmentData.points = pointAdjustment;
        }
        
        console.log('Adjusting loyalty for customer:', customer.id, adjustmentData);
        console.log('Current loyalty values:', { 
          visits: customer.loyaltyVisits, 
          points: customer.loyaltyPoints 
        });
        console.log('New loyalty values:', loyaltyData);
        
        try {
          const loyaltyResult = await apiClient.loyalty.adjustLoyalty(customer.id, adjustmentData);
          console.log('Loyalty adjustment result:', loyaltyResult);
        } catch (loyaltyError: any) {
          console.error('Loyalty adjustment failed:', loyaltyError);
          console.error('Error details:', loyaltyError.response?.data);
          // If loyalty adjustment fails, still show partial success since customer info was updated
          toast({
            title: 'Partial Success',
            description: 'Customer info updated but loyalty adjustment failed. Please try again.',
            variant: 'destructive',
          });
          onUpdate?.();
          return;
        }
      }
      
      // Only show success and update UI if everything succeeded
      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      });
      setIsEditing(false);
      
      // Update the local customer object with new values for immediate UI update
      Object.assign(customer, {
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        mobile: formData.phone || undefined,
        notes: formData.notes || undefined,
        loyaltyVisits: loyaltyData.loyaltyVisits,
        loyaltyPoints: loyaltyData.loyaltyPoints,
      });
      
      // Trigger refresh of the customer list
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
    setFormData(safeCustomerFormData(customer));
    setLoyaltyData(safeLoyaltyFormData(customer));
    setIsEditing(false);
  };

  const loadBookingHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await apiClient.getBookings({
        customerId: customer.id,
        startDate: historyDateRange.start.toISOString(),
        endDate: historyDateRange.end.toISOString(),
        limit: 100
      });
      setBookings(response);
    } catch (error) {
      console.error('Failed to load booking history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking history',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory && customer) {
      loadBookingHistory();
    }
  }, [showHistory, customer?.id]);

  const isVIP = customer.totalSpent > 1000 || customer.totalVisits > 10;
  const lastVisit = customer.updatedAt ? new Date(customer.updatedAt) : null;
  const memberSince = formatDistanceToNow(parseISO(customer.createdAt), { addSuffix: true });

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
                isVIP ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : "bg-gradient-to-br from-teal-500 to-teal-700"
              )}>
                {formatInitials(customer.firstName, customer.lastName)}
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
                      {formatName(customer.firstName, customer.lastName)}
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
            <div className="text-center p-3 bg-teal-50 rounded-lg">
              <Calendar className="h-5 w-5 text-teal-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{customer.totalVisits}</p>
              <p className="text-xs text-gray-600">Total Visits</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">
                ${customer.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-600">Spent</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Gift className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">
                {(customer.loyaltyVisits || 0).toLocaleString('en-US')}
              </p>
              <p className="text-xs text-gray-600">Loyalty Visits</p>
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
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {(customer.mobile || customer.phone) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{customer.mobile || customer.phone}</span>
                    </div>
                  )}
                  {lastVisit && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last visit {formatDistanceToNow(lastVisit, { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Loyalty Information */}
            <div className="space-y-2">
              <Label className="text-sm">Loyalty Program</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Loyalty Visits</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        min="0"
                        value={loyaltyData.loyaltyVisits}
                        onChange={(e) => setLoyaltyData({ ...loyaltyData, loyaltyVisits: parseInt(e.target.value) || 0 })}
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Gift className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{customer.loyaltyVisits || 0} visits</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Loyalty Points</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        min="0"
                        value={loyaltyData.loyaltyPoints}
                        onChange={(e) => setLoyaltyData({ ...loyaltyData, loyaltyPoints: parseInt(e.target.value) || 0 })}
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Star className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{customer.loyaltyPoints || 0} points</span>
                    </div>
                  )}
                </div>
              </div>
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
                  {customer.notes || 'No notes yet'}
                </p>
              )}
            </div>

            {/* Booking History */}
            {!isEditing && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full gap-2"
                >
                  <Clock className="h-4 w-4" />
                  {showHistory ? 'Hide History' : 'View Full History'}
                </Button>
                
                {showHistory && (
                  <div className="mt-4 space-y-2">
                    {loadingHistory ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Loading booking history...
                      </div>
                    ) : bookings.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        <p className="text-xs text-gray-500 mb-2">
                          Showing {bookings.length} bookings from last 90 days
                        </p>
                        {bookings.map((booking: any) => (
                          <div key={booking.id} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{booking.serviceName || 'Service not selected'}</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(booking.startTime || booking.date), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${booking.totalAmount || booking.price || 0}</p>
                                <Badge 
                                  variant={booking.status === 'completed' ? 'default' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            router.push(`/customers/${customer.id}`);
                            onOpenChange(false);
                          }}
                          className="w-full mt-2"
                        >
                          View Complete History →
                        </Button>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-sm text-gray-500">
                        No bookings found in the selected date range
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 pt-4 border-t bg-gray-50">
            <Button 
              variant="ghost" 
              onClick={() => {
                router.push(`/customers/${customer.id}`);
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