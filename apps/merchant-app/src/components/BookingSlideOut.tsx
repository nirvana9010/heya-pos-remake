"use client";

// Build timestamp - updates when file is saved
const __SLIDEOUT_BUILD_TIME__ = new Date().toLocaleString();

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  ChevronRight, 
  User, 
  Clock, 
  Scissors, 
  Calendar,
  DollarSign,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Users,
  Loader2,
  UserPlus
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { format } from "date-fns";
import { SlideOutPanel } from "./SlideOutPanel";
import { apiClient } from "@/lib/api-client";
import { CustomerSearchInput, type Customer } from "@/components/customers";
import { getAvailableStaff, formatAvailabilityMessage, ensureValidStaffId } from "@/lib/services/mock-availability.service";
import { NEXT_AVAILABLE_STAFF_ID, isNextAvailableStaff } from "@/lib/constants/booking-constants";
import { useAuth } from "@/lib/auth/auth-provider";
import { useTimezone } from "@/contexts/timezone-context";

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

type Step = "datetime" | "service" | "customer" | "confirm";

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
  const { formatInMerchantTz } = useTimezone();
  
  // Use prop merchant if provided, otherwise fall back to auth merchant
  const merchant = merchantProp || authMerchant;
  
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
  
  const [currentStep, setCurrentStep] = useState<Step>("datetime");
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    isNewCustomer: true,
    isWalkIn: false,
    selectedServices: [] as string[],
    staffId: initialStaffId || NEXT_AVAILABLE_STAFF_ID,
    date: initialDate || defaultDate,
    time: initialTime || defaultTime,
    notes: "",
    sendReminder: true
  });
  
  const [availableStaff, setAvailableStaff] = useState<typeof staff>([]);
  const [unavailableStaff, setUnavailableStaff] = useState<Array<{ staff: typeof staff[0]; reason: string }>>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>("");
  const [nextAvailableStaff, setNextAvailableStaff] = useState<typeof staff[0] | null>(null);


  // Reset to first step and update initial values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("datetime");
      // Update date/time/staff from props when dialog opens
      setFormData(prev => ({
        ...prev,
        date: initialDate || defaultDate,
        time: initialTime || defaultTime,
        staffId: initialStaffId || NEXT_AVAILABLE_STAFF_ID,
        // Reset selectedServices when dialog opens to avoid stale data
        selectedServices: []
      }));
    }
  }, [isOpen, initialDate, initialTime, initialStaffId, defaultDate, defaultTime]);
  
  // Memoize selected services list to avoid infinite loops
  const selectedServicesList = useMemo(
    () => services.filter(s => formData.selectedServices.includes(s.id)),
    [services, formData.selectedServices]
  );
  
  // Check staff availability when services and datetime are selected
  useEffect(() => {
    const checkAvailability = async () => {
      // Check availability even without service (use default duration)
      if (!formData.date || !formData.time) {
        setAvailableStaff(staff);
        setUnavailableStaff([]);
        setAvailabilityMessage("");
        setNextAvailableStaff(null);
        return;
      }
      
      setIsCheckingAvailability(true);
      
      try {
        // Calculate total duration from all selected services or use default
        let duration = 30; // Default 30 minutes when no service selected
        if (formData.selectedServices.length > 0) {
          duration = selectedServicesList.reduce((total, service) => total + service.duration, 0);
        }
        
        // Combine date and time
        const startTime = new Date(formData.date);
        startTime.setHours(formData.time.getHours());
        startTime.setMinutes(formData.time.getMinutes());
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);
        
        // Check availability (use first service ID or default)
        const result = await getAvailableStaff(
          formData.selectedServices[0] || 'default',
          startTime,
          duration,
          filteredStaff,
          bookings
        );
        
        setAvailableStaff(result.available);
        setUnavailableStaff(result.unavailable);
        setAvailabilityMessage(formatAvailabilityMessage(result));
        
        // Set the auto-assigned staff if using "Next Available"
        if (isNextAvailableStaff(formData.staffId)) {
          setNextAvailableStaff(result.assignedStaff || null);
        } else {
          setNextAvailableStaff(null);
        }
        
        // If the currently selected staff is not available, clear selection
        if (formData.staffId && 
            !isNextAvailableStaff(formData.staffId) && 
            !result.available.find(s => s.id === formData.staffId)) {
          setFormData(prev => ({ ...prev, staffId: '' }));
        }
        
      } finally {
        setIsCheckingAvailability(false);
      }
    };
    
    checkAvailability();
  }, [formData.selectedServices, formData.date, formData.time, formData.staffId, filteredStaff, services, bookings]);

  const steps: Array<{ id: Step; label: string; icon: React.ReactNode }> = [
    { id: "datetime", label: "Date & Time", icon: <Calendar className="h-4 w-4" /> },
    { id: "service", label: "Service", icon: <Scissors className="h-4 w-4" /> },
    { id: "customer", label: "Customer", icon: <User className="h-4 w-4" /> },
    { id: "confirm", label: "Confirm", icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const selectedStaff = filteredStaff.find(s => s.id === formData.staffId);

  const generateWalkInCustomer = async () => {
    try {
      // Search for existing walk-in customer
      const searchResponse = await apiClient.searchCustomers('Walk-in');
      const customers = searchResponse?.data || [];
      const existingWalkInCustomer = customers.find((customer: any) => 
        customer.firstName === 'Walk-in' && 
        (!customer.lastName || customer.lastName === '') &&
        customer.source === 'WALK_IN'
      );
      
      if (existingWalkInCustomer) {
        // Use existing walk-in customer
        setFormData({
          ...formData,
          customerId: existingWalkInCustomer.id,
          customerName: 'Walk-in',
          customerPhone: existingWalkInCustomer.phone || existingWalkInCustomer.mobile || '',
          customerEmail: '', // Never use email for walk-in
          isNewCustomer: false,
          isWalkIn: true
        });
      } else {
        // No existing walk-in customer found, will create one on first use
        setFormData({
          ...formData,
          customerId: '', // Will be created as new customer
          customerName: 'Walk-in',
          customerPhone: '', // No phone for walk-in
          customerEmail: '',
          isNewCustomer: true,
          isWalkIn: true
        });
      }
    } catch (error) {
      console.error('Failed to search for existing walk-in customer:', error);
      // Fallback to creating new walk-in customer
      setFormData({
        ...formData,
        customerId: '',
        customerName: 'Walk-in',
        customerPhone: '',
        customerEmail: '',
        isNewCustomer: true,
        isWalkIn: true
      });
    }
    
    // Auto-proceed to next step
    handleNext();
  };

  const handleNext = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleSubmit = () => {
    if (!formData.time || !formData.date || formData.selectedServices.length === 0) {
      return;
    }
    
    // Debug: Log what's in selectedServices
    console.log('BookingSlideOut - selectedServices:', formData.selectedServices);
    console.log('BookingSlideOut - selectedServicesList:', selectedServicesList);
    
    // Validate service IDs
    const invalidServiceIds = formData.selectedServices.filter(id => !id || id.trim() === '');
    if (invalidServiceIds.length > 0) {
      console.error('Invalid service IDs found:', invalidServiceIds);
      alert('Error: Some selected services have invalid IDs. Please try selecting services again.');
      return;
    }
    
    // Properly combine the selected date with the selected time
    const combinedDateTime = new Date(formData.date);
    combinedDateTime.setHours(formData.time.getHours());
    combinedDateTime.setMinutes(formData.time.getMinutes());
    combinedDateTime.setSeconds(0);
    combinedDateTime.setMilliseconds(0);
    
    // Resolve the final staff ID - this is CRITICAL for API compatibility
    let finalStaffId: string;
    try {
      if (isNextAvailableStaff(formData.staffId)) {
        // Use the pre-assigned staff from availability check
        finalStaffId = ensureValidStaffId(null, nextAvailableStaff);
      } else {
        // Use the selected staff
        finalStaffId = ensureValidStaffId(formData.staffId, null);
      }
    } catch (error) {
      // This should rarely happen as UI prevents it, but we need to handle it
      alert('Please select a staff member or ensure staff are available at the selected time.');
      return;
    }
    
    // Calculate total duration
    const totalDuration = selectedServicesList.reduce((total, service) => total + service.duration, 0);
    
    // Build the save data with services array format for V2 API
    const saveData = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      isNewCustomer: formData.isNewCustomer,
      isWalkIn: formData.isWalkIn,
      services: formData.selectedServices.map(serviceId => ({
        serviceId,
        staffId: finalStaffId
      })),
      staffId: finalStaffId,
      startTime: combinedDateTime,
      endTime: new Date(combinedDateTime.getTime() + totalDuration * 60000),
      notes: formData.notes,
      sendReminder: formData.sendReminder,
      // Add customer source for walk-in customers
      ...(formData.isWalkIn && { customerSource: 'WALK_IN' })
    };
    
    // Debug: Log the save data being sent
    console.log('BookingSlideOut - saveData being sent:', JSON.stringify(saveData, null, 2));
    
    
    onSave(saveData);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "customer":
        return (
          <div className="space-y-4">
            <div>
              <Label>Find or Create Customer</Label>
              <CustomerSearchInput
                value={formData.customerId ? {
                  id: formData.customerId,
                  firstName: formData.isWalkIn ? 'Walk-in' : (formData.customerName.split(' ')[0] || ''),
                  lastName: formData.isWalkIn ? 'Customer' : (formData.customerName.split(' ').slice(1).join(' ') || ''),
                  name: formData.customerName,
                  phone: formData.customerPhone,
                  email: formData.customerEmail
                } : null}
                onSelect={(customer) => {
                  if (customer) {
                    const fullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                    setFormData({
                      ...formData,
                      customerId: customer.id,
                      customerName: fullName,
                      customerPhone: customer.mobile || customer.phone || '',
                      customerEmail: customer.email || "",
                      isNewCustomer: false,
                      isWalkIn: false
                    });
                    handleNext();
                  } else {
                    // Clear selection
                    setFormData({
                      ...formData,
                      customerId: '',
                      customerName: '',
                      customerPhone: '',
                      customerEmail: '',
                      isNewCustomer: true,
                      isWalkIn: false
                    });
                  }
                }}
                onCreateNew={() => {
                  setFormData({
                    ...formData,
                    isNewCustomer: true
                  });
                }}
                fallbackCustomers={customers}
                className="mt-1"
                autoFocus
              />
            </div>

            {/* Walk-in Customer Button */}
            {merchant?.settings?.allowWalkInBookings !== false && (
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

            {formData.isNewCustomer && !formData.isWalkIn && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Create New Customer</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="customerName">Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="0400 123 456"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Walk-in Customer Indicator */}
            {formData.isWalkIn && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-5 w-5 text-gray-600" />
                  <h4 className="font-medium">Walk-in</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Quick booking for: <span className="font-medium">{formData.customerName}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  No contact details will be stored for this customer
                </p>
              </div>
            )}
          </div>
        );

      case "service":
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {services.map((service) => {
                const isSelected = formData.selectedServices.includes(service.id);
                return (
                  <div
                    key={service.id}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => {
                      console.log('Service clicked:', service.id, service);
                      if (!service.id) {
                        console.error('Service has no ID!', service);
                        return;
                      }
                      
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          selectedServices: formData.selectedServices.filter(id => id !== service.id)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          selectedServices: [...formData.selectedServices, service.id]
                        });
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            {service.categoryName && (
                              <Badge variant="secondary" className="mt-1">
                                {service.categoryName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${service.price}</div>
                        <div className="text-sm text-gray-600">{service.duration} min</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Selected Services Summary */}
            {formData.selectedServices.length > 0 && (
              <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h4 className="font-medium text-teal-900 mb-2">
                  Selected Services ({formData.selectedServices.length})
                </h4>
                <div className="space-y-2">
                  {selectedServicesList.map((service) => (
                    <div key={service.id} className="flex items-center justify-between text-sm">
                      <span>{service.name}</span>
                      <span className="font-medium">${service.price}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-teal-200">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <div className="text-right">
                        <div>${selectedServicesList.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</div>
                        <div className="text-xs font-normal text-teal-700">
                          {selectedServicesList.reduce((sum, s) => sum + s.duration, 0)} minutes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "datetime":
        return (
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select
                value={formData.staffId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, staffId: value }))}
                disabled={isCheckingAvailability}
              >
                <SelectTrigger className={cn("mt-1", isCheckingAvailability && "opacity-70")}>
                  <SelectValue placeholder={isCheckingAvailability ? "Checking availability..." : "Select staff member"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Check if we're still loading */}
                  {isCheckingAvailability ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Checking availability...</p>
                    </div>
                  ) : formData.serviceId && availableStaff.length === 0 ? (
                    /* No staff available at all */
                    <div className="p-4 text-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-700">No staff available</p>
                      <p className="text-xs text-red-600 mt-1">Please select a different time</p>
                    </div>
                  ) : (
                    /* Normal staff selection */
                    <>
                      {/* Only show Next Available if we have available staff */}
                      {(!formData.serviceId || availableStaff.length > 0) && (
                        <>
                          <SelectItem value={NEXT_AVAILABLE_STAFF_ID}>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-600" />
                              <span>Next Available</span>
                              {availableStaff.length > 0 && (
                                <>
                                  <span className="text-xs text-gray-500">({availableStaff.length} available)</span>
                                  {nextAvailableStaff && (
                                    <span className="text-xs text-teal-600 font-medium ml-1">
                                      → {nextAvailableStaff.name}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </SelectItem>
                          <Separator className="my-1" />
                        </>
                      )}
                  
                  {/* Show available staff */}
                  {availableStaff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: member.color }}
                        />
                        <span>{member.name}</span>
                        <CheckCircle className="w-3 h-3 text-green-600 ml-auto" />
                      </div>
                    </SelectItem>
                  ))}
                  
                  {/* Show unavailable staff if any */}
                  {unavailableStaff.length > 0 && availableStaff.length > 0 && (
                    <Separator className="my-1" />
                  )}
                  
                  {unavailableStaff.map(({ staff: member, reason }) => (
                    <SelectItem key={member.id} value={member.id} disabled>
                      <div className="flex items-center gap-2 opacity-50">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: member.color }}
                        />
                        <span>{member.name}</span>
                        <span className="text-xs text-red-600 ml-auto">{reason}</span>
                      </div>
                    </SelectItem>
                  ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {/* Availability message */}
              {(formData.date && formData.time) && (
                <div className={cn(
                  "mt-2 text-sm",
                  !isCheckingAvailability && availableStaff.length === 0 ? "text-red-600" : "text-gray-600"
                )}>
                  {isCheckingAvailability ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking staff availability...</span>
                    </div>
                  ) : availabilityMessage ? (
                    <>
                      <div className="flex items-center gap-2">
                        {availableStaff.length === 0 ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {availabilityMessage}
                      </div>
                      
                      {/* Show auto-assignment details when Next Available is selected */}
                      {isNextAvailableStaff(formData.staffId) && nextAvailableStaff && (
                        <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded-md">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: nextAvailableStaff.color }}
                            />
                            <span className="text-teal-800 font-medium">
                              Will be assigned to: {nextAvailableStaff.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time ? format(formData.time, "HH:mm") : ""}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newTime = new Date(formData.date || new Date());
                  newTime.setHours(parseInt(hours), parseInt(minutes));
                  setFormData({ ...formData, time: newTime });
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any special requests or notes..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-900 mb-3">Booking Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{formData.customerName}</span>
                </div>
                {formData.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{formData.customerPhone}</span>
                  </div>
                )}
                {selectedServicesList.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Services:</span>
                      <span className="font-medium">{selectedServicesList.length} selected</span>
                    </div>
                    {selectedServicesList.map((service) => (
                      <div key={service.id} className="ml-4 text-sm flex justify-between">
                        <span className="text-gray-600">{service.name}</span>
                        <span>${service.price}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Total Duration:</span>
                      <span className="font-medium">
                        {selectedServicesList.reduce((sum, s) => sum + s.duration, 0)} minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Price:</span>
                      <span className="font-medium">
                        ${selectedServicesList.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff:</span>
                  <span className="font-medium">
                    {isNextAvailableStaff(formData.staffId) ? (
                      nextAvailableStaff ? 
                        `${nextAvailableStaff.name} (auto-assigned)` : 
                        availableStaff.length > 0 ?
                          `Next Available (${availableStaff[0].name})` :
                          'No staff available'
                    ) : (
                      selectedStaff?.name || 'Select staff'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium">
                    {formData.date && formData.time ? 
                      `${format(formData.date, "MMM d, yyyy")} at ${format(formData.time, "h:mm a")}` : 
                      "Not selected"}
                  </span>
                </div>
              </div>
            </div>

            {formData.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
                <p className="text-sm text-gray-600">{formData.notes}</p>
              </div>
            )}

            {/* Show warning if no staff available */}
            {isNextAvailableStaff(formData.staffId) && !nextAvailableStaff ? (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  No staff available at this time. Please go back and select a different time.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  A confirmation will be sent to the customer
                </span>
              </div>
            )}
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "datetime":
        // Must have date, time, and either a selected staff OR available staff for "next available"
        const hasDateTime = formData.date && formData.time;
        const hasValidStaff = formData.staffId && (
          // If Next Available is selected, ensure we have someone to assign
          isNextAvailableStaff(formData.staffId) ? nextAvailableStaff !== null : true
        );
        return hasDateTime && hasValidStaff && !isCheckingAvailability;
      case "service":
        return formData.selectedServices.length > 0;
      case "customer":
        return formData.customerName; // Only name is required
      default:
        return true;
    }
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New Booking"
      width="wide"
      preserveState={false}
      footer={
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            Back
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep !== "confirm" ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                className="bg-teal-600 hover:bg-teal-700"
                disabled={isNextAvailableStaff(formData.staffId) && !nextAvailableStaff}
              >
                Confirm Booking
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <button
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                  currentStep === step.id
                    ? "bg-teal-100 text-teal-700"
                    : index < currentStepIndex
                    ? "text-green-600"
                    : "text-gray-400"
                )}
                onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                disabled={index > currentStepIndex}
              >
                {step.icon}
                <span className="font-medium">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}
    </SlideOutPanel>
  );
}