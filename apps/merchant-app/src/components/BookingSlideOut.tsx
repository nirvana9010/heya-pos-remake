"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  ChevronRight, 
  User, 
  Clock, 
  Scissors, 
  Calendar,
  Phone,
  Mail,
  Loader2,
  UserPlus,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { format } from "date-fns";
import { SlideOutPanel } from "./SlideOutPanel";
import { ServiceSelectionSlideout } from "./ServiceSelectionSlideout";
import { apiClient } from "@/lib/api-client";
import { CustomerSearchInput, type Customer } from "@/components/customers";
import { WALK_IN_CUSTOMER_ID, isWalkInCustomer } from "@/lib/constants/customer";
import { useAuth } from "@/lib/auth/auth-provider";
import { invalidateBookingsCache } from "@/lib/cache-config";

interface BookingSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialTime?: Date;
  initialStaffId?: string;
  staff: Array<{ id: string; name: string; color: string }>;
  services: Array<{ id: string; name: string; price: number; duration: number; categoryName?: string }>;
  customers?: Array<{ id: string; name: string; phone: string; mobile?: string; email?: string }>;
  bookings?: Array<any>; // For availability checking
  onSave: (booking: any) => void;
  merchant?: {
    settings?: {
      allowWalkInBookings?: boolean;
      allowUnassignedBookings?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface SelectedService {
  id: string; // Temporary UI ID
  serviceId: string;
  name: string;
  duration: number;
  basePrice: number;
  staffId: string;
  adjustedPrice: number;
  categoryName?: string;
}

export function BookingSlideOut({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  initialStaffId,
  staff,
  services,
  customers = [],
  bookings = [],
  onSave,
  merchant: merchantProp
}: BookingSlideOutProps) {
  const { merchant: authMerchant } = useAuth();
  
  // Use prop merchant if provided, otherwise fall back to auth merchant
  const merchant = merchantProp || authMerchant;
  
  // Debug logging for component lifecycle
  React.useEffect(() => {
    console.log('[BookingSlideOut] Component mounted/updated. isOpen:', isOpen);
    return () => {
      console.log('[BookingSlideOut] Component cleanup. isOpen:', isOpen);
    };
  });
  
  // Removed draft order logic - bookings create their own orders
  
  // Filter out "Unassigned" staff when allowUnassignedBookings is false
  const filteredStaff = React.useMemo(() => {
    if (merchant?.settings?.allowUnassignedBookings === false) {
      return staff.filter(s => 
        s.name.toLowerCase() !== 'unassigned' && 
        s.id.toLowerCase() !== 'unassigned'
      );
    }
    return staff;
  }, [staff, merchant?.settings?.allowUnassignedBookings]);
  
  // Create stable defaults to prevent infinite loops
  const [defaultDate] = useState(() => new Date());
  const [defaultTime] = useState(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const remainder = minutes % 15;
    
    // Round up to next 15-minute interval
    if (remainder === 0) {
      // Already on a 15-minute mark, add 15 minutes
      now.setMinutes(minutes + 15);
    } else {
      // Round up to next 15-minute mark
      now.setMinutes(minutes + (15 - remainder));
    }
    
    // Reset seconds and milliseconds
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    return now;
  });
  
  // Form state
  const [date, setDate] = useState<Date>(initialDate || defaultDate);
  const [time, setTime] = useState<Date>(initialTime || defaultTime);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [notes, setNotes] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  
  // UI state
  const [isServiceSlideoutOpen, setIsServiceSlideoutOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [finalCustomerId, setFinalCustomerId] = useState<string>("");
  
  // Calculate totals
  const totalDuration = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + s.duration, 0), 
    [selectedServices]
  );
  
  const totalPrice = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + s.adjustedPrice, 0), 
    [selectedServices]
  );
  

  // Track previous open state to detect transitions
  const prevIsOpenRef = React.useRef(isOpen);
  const hasInitializedRef = React.useRef(false);

  // Reset form only when transitioning from closed to open
  useEffect(() => {
    const wasClosedNowOpen = !prevIsOpenRef.current && isOpen;
    const wasOpenNowClosed = prevIsOpenRef.current && !isOpen;
    
    if (wasClosedNowOpen && !hasInitializedRef.current) {
      console.log('[BookingSlideOut] Opening - resetting form');
      console.log('[BookingSlideOut] Current selectedServices:', selectedServices.length);
      
      // Only reset if we don't have services selected (prevent accidental reset)
      if (selectedServices.length === 0) {
        // Reset form when opening
        setDate(initialDate || defaultDate);
        setTime(initialTime || defaultTime);
        setSelectedServices([]);
        setCustomerId("");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setIsNewCustomer(true);
        setIsWalkIn(false);
        setNotes("");
        setSendReminder(true);
        setFinalCustomerId("");
      } else {
        console.log('[BookingSlideOut] Preserving existing services:', selectedServices.map(s => s.name));
      }
      
      hasInitializedRef.current = true;
    } else if (wasOpenNowClosed) {
      console.log('[BookingSlideOut] Closing - cleaning up');
      hasInitializedRef.current = false;
    } else if (isOpen) {
      console.log('[BookingSlideOut] Already open - no reset needed');
    }
    
    // Update the ref for next render
    prevIsOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen
  
  
  const handleServiceSelect = (service: any) => {
    console.log('[BookingSlideOut] Service selected:', service.name);
    console.log('[BookingSlideOut] Current selected services:', selectedServices.length);
    console.log('[BookingSlideOut] isOpen state:', isOpen);
    
    // Defensive check to ensure slideout is still open
    if (!isOpen) {
      console.warn('[BookingSlideOut] Attempting to select service but slideout is closed');
      return;
    }
    
    const newService: SelectedService = {
      id: `service-${Date.now()}-${Math.random()}`,
      serviceId: service.id,
      name: service.name,
      duration: service.duration,
      basePrice: service.price,
      adjustedPrice: service.price,
      staffId: filteredStaff[0]?.id || '', // Default to first staff member
      categoryName: service.categoryName
    };
    
    setSelectedServices(prev => {
      const updated = [...prev, newService];
      console.log('[BookingSlideOut] Updated selected services:', updated.length);
      console.log('[BookingSlideOut] New services array:', updated.map(s => s.name));
      return updated;
    });
    
    // Close service slideout with a small delay to ensure state is saved
    setTimeout(() => {
      setIsServiceSlideoutOpen(false);
    }, 50);
  };
  
  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };
  
  const updateServiceStaff = (serviceId: string, staffId: string) => {
    setSelectedServices(selectedServices.map(s => 
      s.id === serviceId ? { ...s, staffId } : s
    ));
  };
  
  const updateServicePrice = (serviceId: string, price: string) => {
    const numPrice = parseFloat(price) || 0;
    setSelectedServices(selectedServices.map(s => 
      s.id === serviceId ? { ...s, adjustedPrice: numPrice } : s
    ));
  };
  
  const generateWalkInCustomer = () => {
    setCustomerId('WALK_IN'); // Use 'WALK_IN' for V2 API
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerEmail('');
    setIsNewCustomer(false);
    setIsWalkIn(true);
  };
  
  
  const handleCreateBooking = async () => {
    // Early return if already saving (prevent duplicate calls)
    if (isSaving) {
      console.log('[BookingSlideOut] Already saving, ignoring duplicate call');
      return;
    }

    if (!time || !date || selectedServices.length === 0 || !customerName) {
      return;
    }
    
    // Validate customerId for non-walk-in customers
    if (!isWalkIn && !customerId) {
      alert('Please select or create a customer');
      return;
    }
    
    // Validate all services have staff assigned
    const servicesWithoutStaff = selectedServices.filter(s => !s.staffId);
    if (servicesWithoutStaff.length > 0) {
      alert('Please select a staff member for all services');
      return;
    }
    
    setIsSaving(true);
    
    // Declare optimisticBooking outside try block so it's accessible in catch
    let optimisticBooking: any;
    
    try {
      // Create new customer if needed
      let resolvedCustomerId = customerId;
      if (isNewCustomer && !isWalkIn) {
        try {
          const newCustomer = await apiClient.customers.createCustomer({
            firstName: customerName.split(' ')[0] || customerName,
            lastName: customerName.split(' ').slice(1).join(' ') || '',
            phone: customerPhone,
            email: customerEmail
          });
          resolvedCustomerId = newCustomer.id;
        } catch (error) {
          console.error('Failed to create customer:', error);
          alert('Failed to create customer. Please try again.');
          setIsSaving(false);
          return;
        }
      }
      
      // Store the final customer ID for order creation
      setFinalCustomerId(isWalkIn ? 'WALK_IN' : resolvedCustomerId);
      
      // Combine date and time
      const combinedDateTime = new Date(date);
      combinedDateTime.setHours(time.getHours());
      combinedDateTime.setMinutes(time.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);
      
      // Build booking data for V2 API
      const startTimeISO = combinedDateTime.toISOString();
      console.log('Start time ISO:', startTimeISO, 'Type:', typeof startTimeISO);
      console.log('Customer ID debug:', {
        isWalkIn,
        customerId: customerId,
        resolvedCustomerId: resolvedCustomerId,
        isNewCustomer,
        finalCustomerIdForBooking: isWalkIn ? 'WALK_IN' : resolvedCustomerId
      });
      
      const finalCustomerIdForBooking = isWalkIn ? 'WALK_IN' : resolvedCustomerId;
      
      console.log('Final booking data validation:', {
        isWalkIn,
        customerId: customerId,
        resolvedCustomerId: resolvedCustomerId,
        finalCustomerIdForBooking: finalCustomerIdForBooking,
        isValidCustomerId: finalCustomerIdForBooking && finalCustomerIdForBooking.length > 0
      });
      
      // Strict validation to prevent API validation errors
      if (!finalCustomerIdForBooking || finalCustomerIdForBooking.trim() === '') {
        console.error('[BookingSlideOut] Customer ID validation failed:', {
          isWalkIn,
          customerId,
          resolvedCustomerId,
          finalCustomerIdForBooking
        });
        throw new Error('Customer ID is required for booking creation');
      }
      
      const bookingData: any = {
        // Use 'WALK_IN' as customerId for walk-in customers
        customerId: finalCustomerIdForBooking,
        services: selectedServices.map(service => ({
          serviceId: service.serviceId,
          staffId: service.staffId,
          // Include price override if changed (V2 uses 'price' not 'priceOverride')
          ...(service.adjustedPrice !== service.basePrice && {
            price: service.adjustedPrice
          })
        })),
        locationId: merchant?.locations?.[0]?.id || merchant?.locationId,
        startTime: startTimeISO,
        notes,
        source: 'IN_PERSON',
        isOverride: true
      };
      
      console.log('Booking data being sent:', JSON.stringify(bookingData, null, 2));
      
      // Create optimistic booking for immediate UI update
      optimisticBooking = {
        id: `temp-${Date.now()}`, // Temporary ID
        bookingNumber: 'PENDING',
        customerName: isWalkIn ? 'Walk-in Customer' : customerName,
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        services: selectedServices.map(s => ({
          id: s.serviceId,
          name: s.name,
          duration: s.duration,
          price: s.adjustedPrice
        })),
        staffName: selectedServices[0] ? staff.find(s => s.id === selectedServices[0].staffId)?.name || '' : '',
        staffId: selectedServices[0]?.staffId || '',
        startTime: combinedDateTime,
        endTime: new Date(combinedDateTime.getTime() + totalDuration * 60 * 1000),
        status: 'pending' as const,
        isPaid: false,
        totalPrice: totalPrice,
        notes: notes || '',
        _isOptimistic: true // Flag to identify optimistic updates
      };
      
      // Immediately update UI with optimistic booking
      onSave(optimisticBooking);
      
      // Cache invalidation before API call
      try {
        invalidateBookingsCache();
      } catch (callbackError) {
        console.error('Error invalidating cache:', callbackError);
      }
      
      // Show immediate loading toast and store the function to dismiss it
      const { dismiss: dismissLoadingToast } = toast({
        title: "Creating booking...",
        description: "Please wait while we create your booking",
        duration: 10000, // Long duration, will be dismissed when complete
      });
      
      // Close the slideout immediately for better UX
      onClose();
      
      // Create the booking
      const response = await apiClient.bookings.createBooking(bookingData);
      
      console.log('Booking created successfully:', response);
      
      // Update with real booking data (parent component should handle replacing optimistic with real)
      if (response && response.id) {
        // Map the API response to the expected format
        const realBooking = {
          ...optimisticBooking,
          id: response.id,
          bookingNumber: response.bookingNumber || 'PENDING',
          status: response.status || 'CONFIRMED',
          _isOptimistic: false,
          _dismissLoadingToast: dismissLoadingToast // Pass the dismiss function
        };
        onSave(realBooking);
      }
      
    } catch (error) {
      console.error('Failed to create booking:', error);
      
      // Dismiss the loading toast
      if (dismissLoadingToast) {
        dismissLoadingToast();
      }
      
      // Remove the optimistic booking on error
      // Parent component should handle removing bookings with matching temp ID
      onSave({ 
        id: optimisticBooking.id, 
        _isOptimistic: true, 
        _remove: true 
      });
      
      // Show error toast instead of alert
      toast({
        title: "Failed to create booking",
        description: "Please try again",
        variant: "destructive",
        duration: 5000,
      });
      
      // Re-open the slideout so user can try again
      // Note: This assumes parent provides a way to re-open, otherwise user needs to start over
    } finally {
      setIsSaving(false);
    }
  };
  
  
  const canCreateBooking = () => {
    return date && time && selectedServices.length > 0 && customerName && !isSaving;
  };
  
  return (
    <>
      <SlideOutPanel
        isOpen={isOpen}
        onClose={onClose}
        title="New Booking"
        width="wide"
        preserveState={true}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBooking}
              disabled={!canCreateBooking()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Booking
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Date & Time Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date & Time
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date ? format(date, "yyyy-MM-dd") : ""}
                  onChange={(e) => setDate(new Date(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time ? format(time, "HH:mm") : ""}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newTime = new Date(date || new Date());
                    newTime.setHours(parseInt(hours), parseInt(minutes));
                    setTime(newTime);
                  }}
                  className="mt-1"
                />
              </div>
            </div>
            {totalDuration > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                Duration: <span className="font-medium">{totalDuration} minutes</span>
              </div>
            )}
          </div>
          
          {/* Services Section */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Services
            </h3>
            
            <Button
              onClick={() => setIsServiceSlideoutOpen(true)}
              variant="outline"
              className="w-full justify-start gap-2 mb-3"
            >
              <Plus className="h-4 w-4" />
              Add Services
            </Button>
            
            {selectedServices.length > 0 && (
              <div className="space-y-2">
                {selectedServices.map((service) => (
                  <div key={service.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-600">
                            {service.duration} min • ${service.basePrice}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeService(service.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Staff</Label>
                          <Select
                            value={service.staffId}
                            onValueChange={(value) => updateServiceStaff(service.id, value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredStaff.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: member.color }}
                                    />
                                    <span>{member.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="w-24">
                          <Label className="text-xs">Price</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              type="number"
                              value={service.adjustedPrice}
                              onChange={(e) => updateServicePrice(service.id, e.target.value)}
                              className="h-9 pl-6"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
                
                {/* Total Summary */}
                <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex justify-between font-medium">
                    <span>Total ({selectedServices.length} services)</span>
                    <div className="text-right">
                      <div>${totalPrice.toFixed(2)}</div>
                      <div className="text-xs font-normal text-teal-700">
                        {totalDuration} minutes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Customer Section */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </h3>
            
            {!isWalkIn && (
              <CustomerSearchInput
                value={customerId && customerId !== 'WALK_IN' ? {
                  id: customerId,
                  firstName: customerName.split(' ')[0] || '',
                  lastName: customerName.split(' ').slice(1).join(' ') || '',
                  name: customerName,
                  phone: customerPhone,
                  email: customerEmail
                } : null}
                onSelect={(customer) => {
                  if (customer) {
                    const fullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                    setCustomerId(customer.id);
                    setCustomerName(fullName);
                    setCustomerPhone(customer.mobile || customer.phone || '');
                    setCustomerEmail(customer.email || "");
                    setIsNewCustomer(false);
                    setIsWalkIn(false);
                  } else {
                    // Clear selection
                    setCustomerId('');
                    setCustomerName('');
                    setCustomerPhone('');
                    setCustomerEmail('');
                    setIsNewCustomer(true);
                    setIsWalkIn(false);
                  }
                }}
                onCreateNew={() => {
                  setIsNewCustomer(true);
                }}
                fallbackCustomers={customers}
                className="mb-3"
              />
            )}
            
            {/* Walk-in Customer Button */}
            {merchant?.settings?.allowWalkInBookings !== false && !isWalkIn && (
              <div className="flex items-center justify-center py-2">
                <span className="text-sm text-gray-500 mr-3">or</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateWalkInCustomer}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Walk-in
                </Button>
              </div>
            )}
            
            {/* New Customer Form */}
            {isNewCustomer && !isWalkIn && (
              <div className="mt-3 space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium text-sm">New Customer Details</h4>
                <div>
                  <Label htmlFor="customerName">Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0400 123 456"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Walk-in Indicator */}
            {isWalkIn && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-sm">Walk-in Customer</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      No contact details will be stored
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsWalkIn(false);
                      setCustomerId('');
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerEmail('');
                      setIsNewCustomer(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Notes Section */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special requests or notes..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      </SlideOutPanel>
      
      {/* Service Selection Slideout */}
      <ServiceSelectionSlideout
        isOpen={isServiceSlideoutOpen}
        onClose={() => setIsServiceSlideoutOpen(false)}
        services={services}
        onSelectService={handleServiceSelect}
      />
    </>
  );
}