"use client";

import { useState, useEffect, memo } from "react";
import { useNotifications } from '@/contexts/notifications-context';
import { 
  X,
  Clock, 
  Phone,
  Mail,
  DollarSign,
  Calendar,
  User,
  Scissors,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Loader2,
  Plus,
  Minus
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
import { BookingActions } from "./BookingActions";
import { PaymentDialogPortal } from "./PaymentDialogPortal";
import { displayFormats } from "../lib/date-utils";
import { apiClient } from "@/lib/api-client";
import { ServiceSelectionSlideout } from "./ServiceSelectionSlideout";

interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface BookingDetailsSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceName: string; // Deprecated - kept for backward compatibility
    services?: BookingService[]; // Array for multi-service bookings
    staffName: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
    isPaid: boolean;
    totalPrice: number;
    paidAmount?: number; // Actual amount paid (may differ from totalPrice due to adjustments)
    notes?: string;
  };
  staff: Array<{ id: string; name: string; color: string }>;
  services?: Array<{ id: string; name: string; price: number; duration: number; categoryName?: string }>;
  customers?: Array<{ id: string; name: string; phone: string; mobile?: string; email?: string }>;
  onSave: (booking: any) => void;
  onDelete: (bookingId: string) => void;
  onStatusChange: (bookingId: string, status: string) => void;
  onPaymentStatusChange: (bookingId: string, isPaid: boolean, paidAmount?: number) => void;
}

function BookingDetailsSlideOutComponent({
  isOpen,
  onClose,
  booking,
  staff,
  services = [],
  customers = [],
  onSave,
  onDelete,
  onStatusChange,
  onPaymentStatusChange
}: BookingDetailsSlideOutProps) {
  const { toast } = useToast();
  const { refreshNotifications } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [associatedOrder, setAssociatedOrder] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderRefetchTrigger, setOrderRefetchTrigger] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // State for service editing
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [isServiceSlideoutOpen, setIsServiceSlideoutOpen] = useState(false);
  
  // Initialize form data with separate date and time objects
  const initializeFormData = (booking: any) => {
    // Create separate Date objects to avoid shared reference issues
    const startDate = new Date(booking.startTime);
    const startTime = new Date(booking.startTime);
    
    return {
      staffId: booking.staffId,
      date: startDate,
      time: startTime,
      notes: booking.notes || ""
    };
  };
  
  const [formData, setFormData] = useState(() => initializeFormData(booking));

  useEffect(() => {
    // Only reset form data if we're not currently editing
    // This prevents the form from resetting while the user is making changes
    if (!isEditing) {
      setFormData(initializeFormData(booking));
      
      // Initialize selected services from booking
      const bookingServices = booking.services || [];
      setSelectedServices(bookingServices.map((service, index) => ({
        id: `service-${index}-${Date.now()}`,
        serviceId: service.id,
        name: service.name,
        duration: service.duration,
        basePrice: service.price,
        adjustedPrice: service.price,
        staffId: booking.staffId
      })));
    }
  }, [booking, isEditing, customers]);

  // Fetch associated order for the booking
  useEffect(() => {
    const fetchOrder = async () => {
      if (!booking.id || !isOpen) return;
      
      setIsLoadingOrder(true);
      try {
        console.log('[BookingDetailsSlideOut] Fetching order for booking:', {
          bookingId: booking.id,
          isPaid: booking.isPaid,
          bookingTotalPrice: booking.totalPrice
        });
        
        // Try to get the order for this booking
        // First try the optimized prepareOrderForPayment endpoint
        const paymentData = await apiClient.prepareOrderForPayment({
          bookingId: booking.id
        });
        
        if (paymentData?.order) {
          console.log('[BookingDetailsSlideOut] Order fetched successfully:', {
            orderId: paymentData.order.id,
            orderTotal: paymentData.order.totalAmount,
            paidAmount: paymentData.order.paidAmount,
            state: paymentData.order.state,
            modifiers: paymentData.order.modifiers
          });
          setAssociatedOrder(paymentData.order);
        }
      } catch (error: any) {
        console.error('[BookingDetailsSlideOut] Error fetching order:', error);
        // Check if it's a "order already exists" error - if so, we need to fetch it differently
        if (error.message?.includes('already exists') || error.code === 'DUPLICATE_RESOURCE') {
          // Don't set null here - we'll get the order when processing payment
        } else {
          setAssociatedOrder(null);
        }
      } finally {
        setIsLoadingOrder(false);
      }
    };

    // Fetch if booking is paid or if we have an order for payment
    if (booking.isPaid || selectedOrderForPayment || orderRefetchTrigger > 0) {
      fetchOrder();
    }
  }, [booking.id, isOpen, booking.isPaid, selectedOrderForPayment, orderRefetchTrigger, booking.totalPrice]); // Re-fetch when payment status or price changes

  const duration = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60));
  const selectedStaff = staff.find(s => s.id === formData.staffId);
  
  // Calculate progress for in-progress bookings
  const getBookingProgress = () => {
    if (booking.status !== "in-progress") return 0;
    
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.round((elapsed / totalDuration) * 100);
  };
  
  const progress = getBookingProgress();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      case "in-progress": return <PlayCircle className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      case "no-show": return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-teal-100 text-teal-800";
      case "in-progress": return "bg-teal-100 text-teal-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "no-show": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Service management functions
  const handleAddService = (service: any) => {
    const newService = {
      id: `service-${Date.now()}-${Math.random()}`,
      serviceId: service.id,
      name: service.name,
      duration: service.duration,
      basePrice: service.price,
      adjustedPrice: service.price,
      staffId: formData.staffId
    };
    setSelectedServices([...selectedServices, newService]);
    setIsServiceSlideoutOpen(false);
  };
  
  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
  };
  
  const handleServicePriceChange = (serviceId: string, price: number) => {
    setSelectedServices(selectedServices.map(s => 
      s.id === serviceId ? { ...s, adjustedPrice: price } : s
    ));
  };
  
  const handleServiceStaffChange = (serviceId: string, staffId: string) => {
    setSelectedServices(selectedServices.map(s => 
      s.id === serviceId ? { ...s, staffId } : s
    ));
  };
  
  // Calculate totals
  const calculateTotals = () => {
    const subtotal = selectedServices.reduce((sum, s) => sum + s.adjustedPrice, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    
    return { subtotal, total: subtotal, totalDuration };
  };

  const handleSave = () => {
    // Exit edit mode immediately for better UX
    setIsEditing(false);
    
    const { status, ...bookingWithoutStatus } = booking;
    const { totalDuration } = calculateTotals();
    const startTimeISO = formData.time instanceof Date ? formData.time.toISOString() : formData.time;
    const endTimeISO = new Date(formData.time.getTime() + totalDuration * 60000).toISOString();
    
    // Fire and forget - don't await
    onSave({
      ...bookingWithoutStatus,
      staffId: formData.staffId,
      startTime: startTimeISO,
      endTime: endTimeISO,
      notes: formData.notes,
      services: selectedServices.map(s => ({
        id: s.serviceId,
        name: s.name,
        duration: s.duration,
        price: s.adjustedPrice
      }))
    }).then(() => {
      // Show success toast
      toast({
        title: "Booking updated",
        description: `${booking.customerName}'s appointment has been updated successfully.`,
        variant: "default",
        className: "bg-green-50 border-green-200",
        duration: 5000,
      });
      
      // Trigger notification refresh after a delay to ensure backend processing
      setTimeout(() => {
        refreshNotifications();
      }, 2000);
    }).catch(error => {
      // If save fails, re-enter edit mode
      setIsEditing(true);
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      onDelete(booking.id);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setIsStatusUpdating(true);
    
    // Close slideout after 1000ms for in-progress or completed status
    if (newStatus === 'in-progress' || newStatus === 'completed') {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
    
    try {
      // Status update happens in background
      await onStatusChange(bookingId, newStatus);
      
      // Refresh notifications after a delay to allow backend processing
      // Increased to 2 seconds to ensure outbox events are processed
      setTimeout(() => {
        refreshNotifications();
      }, 2000);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handlePaymentToggle = async () => {
    setIsPaymentProcessing(true);
    try {
      const isPaid = booking.isPaid;
      await onPaymentStatusChange(booking.id, !isPaid);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleProcessPayment = async (bookingId: string) => {
    setIsProcessingPayment(true);
    
    // Set a timeout to open the modal within 1000ms regardless of order status
    const timeoutId = setTimeout(() => {
      // If order isn't ready yet, open with a loading state
      if (!selectedOrderForPayment) {
        setSelectedOrderForPayment({ 
          id: `loading-${bookingId}`, 
          isLoading: true,
          totalAmount: booking.totalPrice || 0,
          paidAmount: 0,
          items: []
        });
      }
      setPaymentDialogOpen(true);
    }, 1000);
    
    try {
      // Use the optimized prepareOrderForPayment endpoint
      // This endpoint creates order if needed and returns all payment data in one call
      const paymentData = await apiClient.prepareOrderForPayment({
        bookingId: bookingId
      });
      
      // Clear the timeout if we got data before 1000ms
      clearTimeout(timeoutId);
      
      if (!paymentData || !paymentData.order) {
        throw new Error('No order data received from payment preparation');
      }
      
      // Lock the order if it's in DRAFT state
      if (paymentData.order.state === 'DRAFT') {
        await apiClient.updateOrderState(paymentData.order.id, 'LOCKED');
        // Update the order state in the payment data
        paymentData.order.state = 'LOCKED';
      }
      
      // Update with real order data
      setAssociatedOrder(paymentData.order);
      setSelectedOrderForPayment(paymentData.order);
      
      // Show the payment dialog immediately if not already open
      if (!paymentDialogOpen) {
        setPaymentDialogOpen(true);
      }
    } catch (error: any) {
      // Clear the timeout on error
      clearTimeout(timeoutId);
      
      // Close dialog on error
      setPaymentDialogOpen(false);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to prepare order for payment.';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentComplete = async (updatedOrder: any) => {
    console.log('[BookingDetailsSlideOut] Payment complete - updatedOrder:', {
      id: updatedOrder?.id,
      totalAmount: updatedOrder?.totalAmount,
      paidAmount: updatedOrder?.paidAmount,
      state: updatedOrder?.state,
      modifiers: updatedOrder?.modifiers,
      items: updatedOrder?.items?.map((item: any) => ({ 
        description: item.description, 
        unitPrice: item.unitPrice, 
        quantity: item.quantity,
        discount: item.discount,
        total: item.total
      }))
    });
    
    // Close the payment dialog
    setPaymentDialogOpen(false);
    setSelectedOrderForPayment(null);
    
    // Show success toast immediately
    toast({
      title: "Payment processed",
      description: `Payment for ${booking.customerName}'s booking has been processed successfully.`,
      variant: "default",
      className: "bg-green-50 border-green-200",
      duration: 5000,
    });
    
    // Close the booking slideout immediately (no delay)
    onClose();
    
    // Process everything else in the background
    // Update the associated order state
    setAssociatedOrder(updatedOrder);
    
    // Update the booking's payment status in background with the actual paid amount
    const actualPaidAmount = updatedOrder?.totalAmount || updatedOrder?.paidAmount || booking.totalPrice;
    console.log('[BookingDetailsSlideOut] Calling onPaymentStatusChange with:', {
      bookingId: booking.id,
      isPaid: true,
      actualPaidAmount,
      originalBookingPrice: booking.totalPrice
    });
    onPaymentStatusChange(booking.id, true, actualPaidAmount);
    
    // Force refetch the order to ensure we have latest data
    setOrderRefetchTrigger(prev => prev + 1);
    
    // Refresh notifications after a delay
    setTimeout(() => {
      refreshNotifications();
    }, 2000);
  };

  return (
    <SlideOutPanel isOpen={isOpen} onClose={onClose} title="Booking Details">
      <div className="flex flex-col h-full relative">
        {/* Progress bar for in-progress bookings */}
        {booking.status === "in-progress" && (
          <div className="absolute inset-x-0 top-0 h-1 z-10">
            <div className="h-1 bg-gray-200">
              <div 
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{booking.customerName}</h2>
              <p className="text-sm text-gray-600">
                {booking.services?.length > 0
                  ? booking.services.map(s => s.name).join(' + ')
                  : booking.serviceName}
              </p>
            </div>
            <Badge className={cn("flex items-center gap-1", getStatusColor(booking.status))}>
              {isStatusUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  {booking.status === "in-progress" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {booking.status !== "in-progress" && getStatusIcon(booking.status)}
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
                </>
              )}
            </Badge>
          </div>

          {/* Quick Actions */}
          <BookingActions
            booking={{
              ...booking,
              isPaid: booking.isPaid,
              totalPrice: booking.totalPrice,
              customerPhone: booking.customerPhone,
              customerEmail: booking.customerEmail
            }}
            size="sm"
            variant="inline"
            showEdit={false}
            showDelete={false}
            isPaymentProcessing={isPaymentProcessing}
            isStatusUpdating={isStatusUpdating}
            isProcessingPayment={isProcessingPayment}
            onStatusChange={handleStatusChange}
            onPaymentToggle={handlePaymentToggle}
            onProcessPayment={handleProcessPayment}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <Label>Staff Member</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: member.color }}
                          />
                          {member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={format(formData.date, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    // Create a new time object with the new date but keeping the same time
                    const updatedTime = new Date(formData.time);
                    updatedTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                    setFormData({ 
                      ...formData, 
                      date: newDate, 
                      time: updatedTime 
                    });
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={format(formData.time, "HH:mm")}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    // Create a NEW Date object based on the current date
                    const newTime = new Date(formData.date.getTime()); // Clone the date
                    newTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    setFormData({ ...formData, time: newTime });
                  }}
                  className="mt-1"
                />
              </div>

              <Separator className="my-4" />

              {/* Services Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Services</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsServiceSlideoutOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>
                
                {selectedServices.length === 0 ? (
                  <p className="text-sm text-gray-500">No services selected</p>
                ) : (
                  <div className="space-y-3">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-gray-600">
                              {service.duration} min • Base: ${service.basePrice}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveService(service.id)}
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
                              onValueChange={(value) => handleServiceStaffChange(service.id, value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {staff.map((member) => (
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
                                onChange={(e) => handleServicePriceChange(service.id, parseFloat(e.target.value) || 0)}
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
                    {(() => {
                      const { subtotal, total, totalDuration } = calculateTotals();
                      return (
                        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <div className="space-y-2">
                            <div className="flex justify-between font-medium">
                              <span>Total ({selectedServices.length} services)</span>
                              <div className="text-right">
                                <div>${total.toFixed(2)}</div>
                                <div className="text-xs font-normal text-teal-700">
                                  {totalDuration} minutes
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-6">
              {/* Date & Time */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Date & Time</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{displayFormats.date(booking.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{displayFormats.time(booking.startTime)} - {displayFormats.time(booking.endTime)}</span>
                    <Badge variant="secondary" className="text-xs">{duration} min</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Customer</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{booking.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${booking.customerPhone}`} className="text-blue-600 hover:underline">
                      {booking.customerPhone}
                    </a>
                  </div>
                  {booking.customerEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${booking.customerEmail}`} className="text-blue-600 hover:underline">
                        {booking.customerEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Service & Staff */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Service Details</h3>
                <div className="space-y-2">
                  {booking.services?.length > 0 ? (
                    <>
                      {booking.services.map((service) => (
                        <div key={service.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-gray-400" />
                            <span>{service.name}</span>
                            <span className="text-gray-500">({service.duration}min)</span>
                          </div>
                          <span className="font-medium">${service.price.toFixed(2)}</span>
                        </div>
                      ))}
                      {booking.services.length > 1 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>Total</span>
                            <span>${booking.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-gray-400" />
                        <span>{booking.serviceName}</span>
                      </div>
                      <span className="font-medium">${booking.totalPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm mt-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>with {booking.staffName}</span>
                    {selectedStaff && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedStaff.color }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-col">
                      {(() => {
                        console.log('[BookingDetailsSlideOut] Price display debug:', {
                          bookingId: booking.id,
                          isPaid: booking.isPaid,
                          bookingTotalPrice: booking.totalPrice,
                          bookingPaidAmount: booking.paidAmount,
                          associatedOrder: associatedOrder ? {
                            id: associatedOrder.id,
                            totalAmount: associatedOrder.totalAmount,
                            paidAmount: associatedOrder.paidAmount,
                            modifiers: associatedOrder.modifiers
                          } : null
                        });
                        
                        if (booking.isPaid) {
                          // First check if booking has paidAmount field (from payment completion)
                          if (booking.paidAmount && booking.paidAmount > 0) {
                            const displayAmount = booking.paidAmount;
                            const originalAmount = booking.services?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || booking.totalPrice;
                            return (
                              <span className="text-green-600 font-medium">
                                Paid ${displayAmount.toFixed(2)}
                                {Math.abs(displayAmount - originalAmount) > 0.01 && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    (was ${originalAmount.toFixed(2)})
                                  </span>
                                )}
                              </span>
                            );
                          }
                          // Then check if we have order data
                          else if (associatedOrder) {
                            const displayAmount = Number(associatedOrder.totalAmount) || Number(associatedOrder.paidAmount) || booking.totalPrice;
                            const originalAmount = booking.services?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || booking.totalPrice;
                            return (
                              <span className="text-green-600 font-medium">
                                Paid ${displayAmount.toFixed(2)}
                                {Math.abs(displayAmount - originalAmount) > 0.01 && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    (was ${originalAmount.toFixed(2)})
                                  </span>
                                )}
                              </span>
                            );
                          } else {
                            // Fallback to totalPrice
                            return <span className="text-green-600 font-medium">Paid ${booking.totalPrice.toFixed(2)}</span>;
                          }
                        } else {
                          return <span className="font-medium">${booking.totalPrice.toFixed(2)}</span>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {booking.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-gray-700 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600">
                      {booking.notes || 'No additional notes'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="flex-1"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog - Using Portal to prevent parent re-renders */}
      <PaymentDialogPortal
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={selectedOrderForPayment}
        onPaymentComplete={handlePaymentComplete}
        enableTips={false}
        customer={booking.customerId && customers.find(c => c.id === booking.customerId)}
      />
      
      {/* Service Selection Slideout */}
      <ServiceSelectionSlideout
        isOpen={isServiceSlideoutOpen}
        onClose={() => setIsServiceSlideoutOpen(false)}
        services={services}
        onSelectService={handleAddService}
      />
    </SlideOutPanel>
  );
}

// Memoize the component to prevent unnecessary re-renders when payment dialog state changes
export const BookingDetailsSlideOut = memo(BookingDetailsSlideOutComponent, (prevProps, nextProps) => {
  // Only re-render if these critical props change
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.booking?.id === nextProps.booking?.id &&
    prevProps.booking?.status === nextProps.booking?.status &&
    prevProps.booking?.isPaid === nextProps.booking?.isPaid &&
    prevProps.staff === nextProps.staff &&
    prevProps.services === nextProps.services
  );
});