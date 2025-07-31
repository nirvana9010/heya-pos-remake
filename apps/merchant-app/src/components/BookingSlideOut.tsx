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
  X,
  Gift,
  Pencil,
  Check
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { format } from "date-fns";
import { SlideOutPanel } from "./SlideOutPanel";
import { ServiceSelectionSlideout } from "./ServiceSelectionSlideout";
import { CustomerSelectionSlideout } from "./CustomerSelectionSlideout";
import { apiClient } from "@/lib/api-client";
import type { Customer } from "@/components/customers";
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
  const { toast } = useToast();
  
  // Use prop merchant if provided, otherwise fall back to auth merchant
  const merchant = merchantProp || authMerchant;
  
  
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
    const remainder = minutes % 5;
    
    // Round up to next 5-minute interval
    if (remainder === 0) {
      // Already on a 5-minute mark, add 5 minutes
      now.setMinutes(minutes + 5);
    } else {
      // Round up to next 5-minute mark
      now.setMinutes(minutes + (5 - remainder));
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
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [notes, setNotes] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  
  // UI state
  const [isServiceSlideoutOpen, setIsServiceSlideoutOpen] = useState(false);
  const [isCustomerSlideoutOpen, setIsCustomerSlideoutOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [finalCustomerId, setFinalCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  
  // Calculate totals
  const totalDuration = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + s.duration, 0), 
    [selectedServices]
  );
  
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.adjustedPrice, 0);
  }, [selectedServices]);
  

  // Track previous open state to detect transitions
  const prevIsOpenRef = React.useRef(isOpen);
  const hasInitializedRef = React.useRef(false);

  // Reset form only when transitioning from closed to open
  useEffect(() => {
    const wasClosedNowOpen = !prevIsOpenRef.current && isOpen;
    const wasOpenNowClosed = prevIsOpenRef.current && !isOpen;
    
    if (wasClosedNowOpen) {
      // Always reset form when opening, regardless of services
      // This ensures a fresh start for each new booking
      setDate(initialDate || defaultDate);
      setTime(initialTime || defaultTime);
      setSelectedServices([]);
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setIsWalkIn(false);
      setNotes("");
      setSendReminder(true);
      setFinalCustomerId("");
      setSelectedCustomer(null);
      
      hasInitializedRef.current = true;
    } else if (wasOpenNowClosed) {
      hasInitializedRef.current = false;
    }
    
    // Update the ref for next render
    prevIsOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDate, initialTime]); // Include initialDate and initialTime in dependencies
  
  // Update date and time when initialDate or initialTime props change
  useEffect(() => {
    if (isOpen && initialDate) {
      setDate(initialDate);
    }
  }, [isOpen, initialDate]);
  
  useEffect(() => {
    if (isOpen && initialTime) {
      setTime(initialTime);
    }
  }, [isOpen, initialTime]);
  
  
  const handleServiceSelect = (service: any) => {
    
    // Defensive check to ensure slideout is still open
    if (!isOpen) {
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
  
  const handleSelectCustomer = (customer: Customer | null, walkIn: boolean) => {
    if (walkIn) {
      setCustomerId('WALK_IN'); // Use 'WALK_IN' for V2 API
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerEmail('');
      setIsWalkIn(true);
      setSelectedCustomer(null);
    } else if (customer) {
      const fullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      setCustomerId(customer.id);
      setCustomerName(fullName);
      setCustomerPhone(customer.mobile || customer.phone || '');
      setCustomerEmail(customer.email || '');
      setIsWalkIn(false);
      setSelectedCustomer(customer);
    }
    setIsCustomerSlideoutOpen(false);
  };
  
  
  const handleCreateBooking = async () => {
    // Early return if already saving (prevent duplicate calls)
    if (isSaving) {
      return;
    }

    if (!time || !date || selectedServices.length === 0) {
      return;
    }
    
    // Validate customer selection
    if (!isWalkIn && !selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    
    // Validate all services have staff assigned
    const servicesWithoutStaff = selectedServices.filter(s => !s.staffId);
    if (servicesWithoutStaff.length > 0) {
      alert('Please select a staff member for all services');
      return;
    }
    
    setIsSaving(true);
    
    let dismissLoadingToast: (() => void) | undefined;
    
    try {
      // Customer is already resolved from the selection slideout
      const resolvedCustomerId = isWalkIn ? 'WALK_IN' : selectedCustomer?.id || customerId;
      
      // Store the final customer ID for order creation
      setFinalCustomerId(resolvedCustomerId);
      
      // Combine date and time
      const combinedDateTime = new Date(date);
      combinedDateTime.setHours(time.getHours());
      combinedDateTime.setMinutes(time.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);
      
      // Build booking data for V2 API
      const startTimeISO = combinedDateTime.toISOString();
      
      const finalCustomerIdForBooking = resolvedCustomerId;
      
      // Strict validation to prevent API validation errors
      if (!finalCustomerIdForBooking || finalCustomerIdForBooking.trim() === '') {
        throw new Error('Customer ID is required for booking creation');
      }
      
      const bookingData: any = {
        // Use 'WALK_IN' as customerId for walk-in customers
        customerId: finalCustomerIdForBooking,
        services: selectedServices.map(service => ({
          serviceId: service.serviceId,
          staffId: service.staffId,
          // Include price override if changed (V2 uses 'price' not 'priceOverride')
          // Keep original prices - don't apply loyalty discount here
          ...(service.adjustedPrice !== service.basePrice && {
            price: service.adjustedPrice
          })
        })),
        locationId: merchant?.locations?.[0]?.id || merchant?.locationId,
        startTime: startTimeISO,
        notes: notes,
        source: 'IN_PERSON',
        isOverride: true
      };
      
      
      // Cache invalidation before API call
      try {
        invalidateBookingsCache();
      } catch (callbackError) {
        // Silently ignore cache invalidation errors
      }
      
      // Show immediate loading toast and store the function to dismiss it
      const toastResult = toast({
        title: "Creating booking...",
        description: "Please wait while we create your booking",
        duration: 10000, // Long duration, will be dismissed when complete
      });
      dismissLoadingToast = toastResult.dismiss;
      
      // Close the slideout immediately for better UX
      onClose();
      
      // Create the booking and measure response time
      const startTime = performance.now();
      const response = await apiClient.bookings.createBooking(bookingData);
      const responseTime = performance.now() - startTime;
      
      // Log response time for monitoring
      console.log(`[BookingCreation] Response time: ${responseTime.toFixed(0)}ms`);
      
      // Pass the real booking data to parent component
      if (response && response.id) {
        // Map the API response to the expected format
        const realBooking = {
          id: response.id,
          bookingNumber: response.bookingNumber || 'PENDING',
          customerName: isWalkIn ? 'Walk-in Customer' : (selectedCustomer?.name || 
            `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`.trim()),
          customerPhone: isWalkIn ? '' : (selectedCustomer?.phone || selectedCustomer?.mobile || ''),
          customerEmail: isWalkIn ? '' : (selectedCustomer?.email || ''),
          services: response.services || selectedServices.map(s => ({
            id: s.serviceId,
            name: s.name,
            duration: s.duration,
            price: s.adjustedPrice
          })),
          staffName: selectedServices[0] ? staff.find(s => s.id === selectedServices[0].staffId)?.name || '' : '',
          staffId: selectedServices[0]?.staffId || '',
          startTime: response.startTime || combinedDateTime,
          endTime: response.endTime || new Date(combinedDateTime.getTime() + totalDuration * 60 * 1000),
          // Use the totalAmount from the API response which reflects discounted prices
          totalPrice: response.totalAmount || response.totalPrice || totalPrice,
          // Normalize status to lowercase to match our BookingStatus type
          status: (response.status || 'CONFIRMED').toLowerCase() as any,
          isPaid: false,
          notes: notes || ''
        };
        onSave(realBooking);
        
        // Dismiss the loading toast
        if (dismissLoadingToast) {
          dismissLoadingToast();
        }
        
        // Show success toast
        toast({
          title: "Booking created successfully",
          description: `Booking ${response.bookingNumber} has been created`,
          duration: 3000,
        });
      }
      
    } catch (error) {
      
      // Dismiss the loading toast
      if (dismissLoadingToast) {
        dismissLoadingToast();
      }
      
      
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
                <Label>Time</Label>
                <div className="mt-1 flex items-center border rounded-md">
                  {/* Hour selector */}
                  <Select
                    value={time ? time.getHours().toString() : ""}
                    onValueChange={(hour) => {
                      const newTime = new Date(time || defaultTime);
                      newTime.setHours(parseInt(hour));
                      setTime(newTime);
                    }}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 h-9 px-3">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
                        const ampm = i < 12 ? 'AM' : 'PM';
                        return (
                          <SelectItem key={i} value={i.toString()}>
                            {hour12.toString().padStart(2, '0')} {ampm}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  <span className="text-gray-400">:</span>
                  
                  {/* Minute selector - 5 minute increments */}
                  <Select
                    value={time ? (Math.round(time.getMinutes() / 5) * 5).toString() : ""}
                    onValueChange={(minute) => {
                      const newTime = new Date(time || defaultTime);
                      newTime.setMinutes(parseInt(minute));
                      setTime(newTime);
                    }}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 h-9 px-3">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const minutes = i * 5;
                        return (
                          <SelectItem key={minutes} value={minutes.toString()}>
                            {minutes.toString().padStart(2, '0')}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* AM/PM indicator */}
                  <div className="px-3 text-sm text-gray-600 border-l">
                    {time ? format(time, 'a') : 'AM'}
                  </div>
                </div>
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
                  <div key={service.id} className="p-3 border rounded-lg bg-gray-50">
                      {/* Service Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium text-gray-900">{service.name}</div>
                          <div className="text-sm text-gray-600">
                            {service.duration} min • Base: ${service.basePrice.toFixed(2)}
                            {service.adjustedPrice !== service.basePrice && (
                              <span className={cn(
                                "ml-2 font-medium",
                                service.adjustedPrice < service.basePrice ? "text-green-600" : "text-orange-600"
                              )}>
                                {service.adjustedPrice < service.basePrice 
                                  ? `-$${(service.basePrice - service.adjustedPrice).toFixed(2)}`
                                  : `+$${(service.adjustedPrice - service.basePrice).toFixed(2)}`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeService(service.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Staff and Price Row */}
                      <div className="flex items-center gap-2">
                        {/* Staff Selector */}
                        <Select
                          value={service.staffId}
                          onValueChange={(value) => updateServiceStaff(service.id, value)}
                        >
                          <SelectTrigger className="h-9 w-40 bg-white">
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
                        
                        {/* Price Controls */}
                        <div className="flex items-center gap-1 ml-auto">
                          {editingPriceId === service.id ? (
                            <>
                              {/* Edit Mode */}
                              {/* Negative Adjustments */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServicePrice(service.id, Math.max(0, service.adjustedPrice - 5).toString())}
                                className="h-9 px-2 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              >
                                -$5
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServicePrice(service.id, Math.max(0, service.adjustedPrice - 1).toString())}
                                className="h-9 px-2 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              >
                                -$1
                              </Button>
                              
                              {/* Price Input */}
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                <Input
                                  type="number"
                                  value={service.adjustedPrice}
                                  onChange={(e) => updateServicePrice(service.id, e.target.value)}
                                  className="h-9 w-20 pl-6 pr-1 text-center font-medium bg-white"
                                  step="0.01"
                                  min="0"
                                  autoFocus
                                />
                              </div>
                              
                              {/* Positive Adjustments */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServicePrice(service.id, (service.adjustedPrice + 1).toString())}
                                className="h-9 px-2 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                              >
                                +$1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateServicePrice(service.id, (service.adjustedPrice + 5).toString())}
                                className="h-9 px-2 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                              >
                                +$5
                              </Button>
                              
                              {/* Done Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPriceId(null)}
                                className="h-9 w-9 p-0 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {/* Display Mode */}
                              <div className="flex items-center gap-1">
                                <div className="px-3 py-1.5 bg-white border rounded-md font-medium text-sm">
                                  ${service.adjustedPrice.toFixed(2)}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingPriceId(service.id)}
                                  className="h-9 w-9 p-0 hover:bg-gray-100"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                </Button>
                              </div>
                            </>
                          )}
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
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Customer</Label>
            {selectedCustomer || isWalkIn ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                    {isWalkIn ? (
                      <UserPlus className="h-5 w-5 text-white" />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {isWalkIn ? 'Walk-in Customer' : (
                        selectedCustomer?.name || 
                        `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`.trim()
                      )}
                    </p>
                    {!isWalkIn && selectedCustomer?.phone && (
                      <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCustomerSlideoutOpen(true)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setIsCustomerSlideoutOpen(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Select Customer
              </Button>
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
      
      {/* Customer Selection Slideout */}
      <CustomerSelectionSlideout
        isOpen={isCustomerSlideoutOpen}
        onClose={() => setIsCustomerSlideoutOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        currentCustomer={selectedCustomer}
        isCurrentWalkIn={isWalkIn}
      />
    </>
  );
}