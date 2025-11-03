"use client";

import { useState, useEffect, memo, useRef, useCallback } from "react";
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
  Minus,
  Heart
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
import { CustomerSelectionSlideout } from "./CustomerSelectionSlideout";
import { FifteenMinuteTimeSelect } from "./FifteenMinuteTimeSelect";
import { getBookingSourcePresentation } from '@/components/calendar/refactored/booking-source';
import type { BookingSourceCategory } from '@/lib/booking-source';
import type { Customer } from '@/components/customers';
import { WALK_IN_CUSTOMER_ID } from '@/lib/constants/customer';

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
    bookingNumber?: string; // Human-readable booking number
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceName: string; // Deprecated - kept for backward compatibility
    serviceId?: string; // Single service ID for backward compatibility
    services?: BookingService[]; // Array for multi-service bookings
    staffName: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show" | "deleted";
    isPaid: boolean;
    totalPrice: number;
    paidAmount?: number; // Actual amount paid (may differ from totalPrice due to adjustments)
    notes?: string;
    sourceLabel?: string;
    sourceCategory?: BookingSourceCategory;
    source?: string | null;
    customerSource?: string | null;
    customerRequestedStaff?: boolean;
  };
  staff: Array<{ id: string; name: string; color: string }>;
  services?: Array<{ id: string; name: string; price: number; duration: number; categoryName?: string }>;
  customers?: Array<{ id: string; name: string; phone: string; mobile?: string; email?: string }>;
  onSave: (booking: any) => void;
  onDelete: (bookingId: string) => void;
  onStatusChange: (bookingId: string, status: string) => void;
  onPaymentStatusChange: (bookingId: string, isPaid: boolean, paidAmount?: number) => void;
}

interface EditedCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isWalkIn: boolean;
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
  // Track booking prop changes
  useEffect(() => {
    if (booking) {
      const servicesCount = booking.services?.length || 0;
      const hasMultiServiceName = booking.serviceName?.includes(' + ');
      
      if (servicesCount === 1 && hasMultiServiceName) {
        // Potential prop mismatch: Multi-service name but only one service
      }
    }
  }, [booking]);
  
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
  const sourcePresentation = getBookingSourcePresentation(booking.source, booking.customerSource);
  const SourceIcon = sourcePresentation.icon;
  const [editedCustomer, setEditedCustomer] = useState<EditedCustomer>(() => ({
    id: booking.customerId || '',
    name: booking.customerName,
    phone: booking.customerPhone,
    email: booking.customerEmail,
    isWalkIn: booking.customerSource === 'WALK_IN',
  }));
  const showSourceBadge = sourcePresentation.category !== 'unknown';
  const customerChanged =
    editedCustomer.id !== (booking.customerId || '') ||
    (editedCustomer.isWalkIn && booking.customerId !== WALK_IN_CUSTOMER_ID);
  const displayedCustomerName = isEditing ? editedCustomer.name : booking.customerName;
  const [editedFirstName, ...editedLastParts] = (editedCustomer.name || '').trim().split(' ');
  const currentCustomerForSelection: Customer | null =
    editedCustomer.id && editedCustomer.id !== WALK_IN_CUSTOMER_ID
      ? {
          id: editedCustomer.id,
          firstName: editedFirstName || editedCustomer.name,
          lastName: editedLastParts.join(' '),
          name: editedCustomer.name,
          phone: editedCustomer.phone || '',
          mobile: editedCustomer.phone || '',
          email: editedCustomer.email || '',
        }
      : null;

  // State for service editing
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [isServiceSlideoutOpen, setIsServiceSlideoutOpen] = useState(false);
  const [isCustomerSlideoutOpen, setIsCustomerSlideoutOpen] = useState(false);

  const openServiceSlideout = useCallback(() => {
    setIsCustomerSlideoutOpen(false);
    setIsServiceSlideoutOpen(true);
  }, []);

  const openCustomerSlideout = useCallback(() => {
    setIsServiceSlideoutOpen(false);
    setIsCustomerSlideoutOpen(true);
  }, []);

  const closeAllSlideouts = useCallback(() => {
    setIsServiceSlideoutOpen(false);
    setIsCustomerSlideoutOpen(false);
  }, []);
  
  // Ensure child slideouts are closed when booking details slideout opens
  useEffect(() => {
    if (isOpen) {
      closeAllSlideouts();
    }
  }, [isOpen, closeAllSlideouts]);

  useEffect(() => {
    if (!isEditing) {
      setEditedCustomer({
        id: booking.customerId || '',
        name: booking.customerName,
        phone: booking.customerPhone,
        email: booking.customerEmail,
        isWalkIn: booking.customerSource === 'WALK_IN',
      });
    }
  }, [booking, isEditing]);
  
  // Initialize form data with separate date and time objects
  const initializeFormData = (booking: any) => {
    // Create separate Date objects to avoid shared reference issues
    const startDate = new Date(booking.startTime);
    const startTime = new Date(booking.startTime);
    
    return {
      staffId: booking.staffId,
      date: startDate,
      time: startTime,
      notes: booking.notes || "",
      customerRequestedStaff: Boolean(booking.customerRequestedStaff)
    };
  };
  
  const [formData, setFormData] = useState(() => initializeFormData(booking));
  const lastInitializedServicesSignature = useRef<string | null>(null);

  useEffect(() => {
    // Only reset form data if we're not currently editing
    // This prevents the form from resetting while the user is making changes
    if (!isEditing) {
      setFormData(initializeFormData(booking));
    }
  }, [booking, isEditing]);
  
  // Initialize services whenever the booking payload changes and we're not editing
  useEffect(() => {
    // Don't re-initialize if we're in the middle of editing
    if (isEditing) {
      return;
    }
    
    // Ensure service/customer slideouts are closed when booking changes
    closeAllSlideouts();
    
    // Initialize selected services from booking
    let bookingServices = [];
    
    // Check for service count mismatch
    if (booking.services?.length === 1 && booking.serviceName?.includes(' + ')) {
      // Multi-service name but only 1 service in array - potential data issue
    }
    
    if (booking.services && booking.services.length > 0) {
      // New format with services array
      bookingServices = booking.services.map((s) => {
        // CRITICAL FIX: Handle calendar state where id === serviceId (wrong structure)
        // If id and serviceId are the same, it means we have the service ID in both fields
        const hasProperStructure = s.id !== s.serviceId;
        
        const mapped = {
          id: hasProperStructure ? (s.id || s.serviceId || '') : s.id,  // BookingService record ID
          serviceId: s.serviceId || s.id || '',  // Always use the actual Service ID
          name: s.name || '',
          duration: s.duration || booking.duration || 60,
          price: Number(s.price || (s as any).adjustedPrice || 0),
          staffId: s.staffId
        };
        return mapped;
      });
    } else if (booking.serviceName) {
      // Old format with single service
      // Calculate duration from start/end times if not provided
      const duration = booking.duration || 
        (booking.endTime && booking.startTime ? 
          Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60)) : 
          60);
      
      // Try to find the service ID from the services list if not provided
      let serviceId = booking.serviceId || '';
      if (!serviceId && services && services.length > 0) {
        const matchingService = services.find(s => s.name === booking.serviceName);
        if (matchingService) {
          serviceId = matchingService.id;
        }
      }
          
      bookingServices = [{
        id: serviceId,
        name: (booking.serviceName === 'Service' || booking.serviceName === 'Service not selected') && booking.totalPrice === 0 ? 'Service not selected' : booking.serviceName,
        duration: (booking.serviceName === 'Service' || booking.serviceName === 'Service not selected') && booking.totalPrice === 0 ? 15 : duration,
        price: Number(booking.totalPrice || booking.price || 0)
      }];
    }
      
    
    const initializedServices = bookingServices.map((service, index) => {
      const serviceId = service.serviceId || service.id || booking.serviceId || '';
      const catalogService = services.find(s => s.id === serviceId);
      const catalogPrice = catalogService ? Number(catalogService.price ?? 0) : undefined;
      
      
      const initialized = {
        // Use a stable ID based on serviceId or BookingService ID, not timestamp
        id: service.id || serviceId || `service-${index}`,
        serviceId: serviceId,  // Already extracted correctly above
        name: (service.name === 'Service' || service.name === 'Service not selected') && Number(service.price || 0) === 0 ? 'Service not selected' : service.name,
        duration: (service.name === 'Service' || service.name === 'Service not selected') && Number(service.price || 0) === 0 ? 15 : service.duration,
        basePrice: catalogPrice ?? Number(service.price || 0),
        adjustedPrice: Number(service.price || 0)
        // Removed staffId - we'll use the main staff selection from formData
      };
      
      return initialized;
    });

    const signature = JSON.stringify(initializedServices.map(s => ({
      id: s.id,
      serviceId: s.serviceId,
      price: s.adjustedPrice,
      duration: s.duration
    })));

    if (lastInitializedServicesSignature.current !== signature) {
      lastInitializedServicesSignature.current = signature;
      setSelectedServices(initializedServices);
    }
  }, [booking, services, isEditing, closeAllSlideouts]);


  // Fetch associated order for the booking
  useEffect(() => {
    const fetchOrder = async () => {
      if (!booking.id || !isOpen) return;
      
      setIsLoadingOrder(true);
      try {
        // Skip fetching order for unpaid bookings - it's normal for them not to have an order yet
        if (!booking.isPaid) {
          return;
        }
        
        // Try to get the order for this booking
        // First try the optimized prepareOrderForPayment endpoint
        const paymentData = await apiClient.prepareOrderForPayment({
          bookingId: booking.id
        });
        
        if (paymentData?.order) {
          setAssociatedOrder(paymentData.order);
        }
      } catch (error: any) {
        
        // Check if it's a "order already exists" error - if so, we need to fetch it differently
        if (error?.message?.includes('already exists') || error?.code === 'DUPLICATE_RESOURCE') {
          // Don't set null here - we'll get the order when processing payment
        } else if (error?.status === 404 || error?.code === 'NOT_FOUND') {
          // Order doesn't exist yet - this is normal for new bookings
          setAssociatedOrder(null);
        } else if (error?.message?.includes('connection pool') || error?.code === 'CONNECTION_ERROR') {
          // Database connection issue
          setAssociatedOrder(null);
        } else {
          // Other errors - clear the order
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
      serviceId: service.id || service.serviceId,  // Ensure we're using the actual database ID
      name: service.name,
      duration: service.duration,
      basePrice: service.price,
      adjustedPrice: service.price,
      staffId: formData.staffId
    };
    
    const updatedServices = [...selectedServices, newService];
    setSelectedServices(updatedServices);
    setIsServiceSlideoutOpen(false);
  };
  
  const handleRemoveService = (serviceId: string) => {
    const updatedServices = selectedServices.filter(s => s.id !== serviceId);
    setSelectedServices(updatedServices);
  };
  
  const handleServicePriceChange = (serviceId: string, price: number) => {
    setSelectedServices(selectedServices.map(s => 
      s.id === serviceId ? { ...s, adjustedPrice: price } : s
    ));
  };

  const handleCustomerSelect = (customer: Customer | null, isWalkIn: boolean) => {
    if (isWalkIn) {
      setEditedCustomer({
        id: WALK_IN_CUSTOMER_ID,
        name: 'Walk-in Customer',
        phone: '',
        email: '',
        isWalkIn: true,
      });
    } else if (customer) {
      const displayName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer';
      setEditedCustomer({
        id: customer.id,
        name: displayName,
        phone: customer.mobile || customer.phone || '',
        email: customer.email || '',
        isWalkIn: false,
      });
    }
    setIsCustomerSlideoutOpen(false);
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
    
    const servicesToSend = selectedServices.map(s => ({
      serviceId: s.serviceId,  // API expects 'serviceId', not 'id'
      staffId: formData.staffId,  // Always use the single staff selection
      price: s.adjustedPrice,
      duration: s.duration,
      name: s.name  // Include name for display purposes
    }));
    
    // Validate that all services have valid IDs
    const invalidServices = servicesToSend.filter(s => !s.serviceId);
    if (invalidServices.length > 0) {
      toast({
        title: "Error",
        description: "Some services are missing IDs. Please re-select the services.",
        variant: "destructive"
      });
      return;
    }
    
    // Add to calendar activity log
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('calendar-activity-log', {
        detail: {
          type: 'booking-update',
          message: `Updating booking ${booking.id} with ${servicesToSend.length} services`,
          data: {
            bookingId: booking.id,
            services: servicesToSend.map(s => ({
              serviceId: s.serviceId,
              name: s.name,
              staffId: s.staffId
            }))
          },
          timestamp: new Date().toISOString()
        }
      }));
    }
    
    // Fire and forget - don't await
    const updatePayload: Record<string, any> = {
      ...bookingWithoutStatus,
      staffId: formData.staffId,
      startTime: startTimeISO,
      endTime: endTimeISO,
      notes: formData.notes,
      services: servicesToSend,
      customerRequestedStaff: formData.customerRequestedStaff
    };

    if (editedCustomer?.id) {
      updatePayload.customerId = editedCustomer.id;
      updatePayload.customerName = editedCustomer.name;
      updatePayload.customerPhone = editedCustomer.phone || '';
      updatePayload.customerEmail = editedCustomer.email || '';
    }
    
    onSave(updatePayload).then(async (response) => {
      // Success handled - BookingsManager shows the success toast
      // Trigger notification refresh after a delay to ensure backend processing
      setTimeout(() => {
        refreshNotifications();
      }, 2000);
    }).catch(error => {
      // If save fails, re-enter edit mode
      setIsEditing(true);
      // BookingsManager already shows the error toast
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      onDelete(booking.id);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    // Don't show "Updating..." for optimistic updates - the status will change immediately
    // Only close slideout for in-progress or completed status
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
      // No need to set isStatusUpdating since we're doing optimistic updates
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
      
      // Don't lock the order here - let the payment dialog handle it after applying modifiers
      // Just update with real order data
      setAssociatedOrder(paymentData.order);
      setSelectedOrderForPayment(paymentData.order);
      
      // Show the payment dialog immediately if not already open
      if (!paymentDialogOpen) {
        setPaymentDialogOpen(true);
      }
    } catch (error: any) {
      // Clear the timeout on error
      clearTimeout(timeoutId);
      
      // Check if booking might not be synced yet
      if (error?.status === 404 || error?.message?.includes('not found')) {
        // Retry after a short delay
        setTimeout(async () => {
          try {
            const paymentData = await apiClient.prepareOrderForPayment({
              bookingId: bookingId
            });
            
            if (paymentData?.order) {
              // Don't lock the order here - let the payment dialog handle it
              setAssociatedOrder(paymentData.order);
              setSelectedOrderForPayment(paymentData.order);
              setPaymentDialogOpen(true);
            }
          } catch (retryError: any) {
            // Still failed after retry
            setPaymentDialogOpen(false);
            
            toast({
              title: "Unable to process payment",
              description: "The booking may still be processing. Please wait a moment and try again.",
              variant: "destructive",
            });
          } finally {
            setIsProcessingPayment(false);
          }
        }, 1500); // Wait 1.5 seconds before retry
        
        return; // Exit early, don't set processing to false yet
      }
      
      // Close dialog on other errors
      setPaymentDialogOpen(false);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to prepare order for payment.';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentComplete = async (updatedOrder: any) => {
    
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
              <h2 className="text-lg font-semibold">{displayedCustomerName}</h2>
              <p className="text-sm text-gray-600">
                {booking.services?.length > 0
                  ? booking.services.map(s => s.name).join(' + ')
                  : ((booking.serviceName === "Service not selected" || booking.serviceName === "Service") && booking.totalPrice === 0
                      ? <span className="italic text-orange-600">Service not selected - Click Edit to add</span>
                      : booking.serviceName)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {booking.bookingNumber || `ID: ${booking.id.slice(-8)}`}
              </p>
              {showSourceBadge && (
                <div className="mt-2">
                  <span className={sourcePresentation.badgeClassName}>
                    <SourceIcon className={cn('h-3.5 w-3.5', sourcePresentation.iconClassName)} />
                    <span>{sourcePresentation.label}</span>
                  </span>
                </div>
              )}
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
                  {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1).replace('-', ' ') || 'Unknown'}
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
                <div className="flex items-center justify-between">
                  <Label>Customer</Label>
                  {customerChanged && (
                    <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">
                      Updated
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-start justify-between rounded-md border border-gray-200 bg-white p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{editedCustomer.name}</p>
                    {(editedCustomer.phone || editedCustomer.email) && (
                      <div className="mt-1 space-y-1 text-xs text-gray-500">
                        {editedCustomer.phone && <p>{editedCustomer.phone}</p>}
                        {editedCustomer.email && <p>{editedCustomer.email}</p>}
                      </div>
                    )}
                    {!editedCustomer.phone && !editedCustomer.email && (
                      <p className="mt-1 text-xs italic text-gray-400">No contact details on file</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openCustomerSlideout}
                    className="ml-3 shrink-0"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Change
                  </Button>
                </div>
              </div>

              <div>
                <Label>Staff Member</Label>
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, customerRequestedStaff: !formData.customerRequestedStaff })}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border transition-colors",
                      formData.customerRequestedStaff
                        ? "border-teal-500 bg-teal-50 text-teal-600"
                        : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                    )}
                    aria-pressed={formData.customerRequestedStaff}
                    aria-label={formData.customerRequestedStaff ? "Unmark preferred staff" : "Mark staff as preferred"}
                    title={formData.customerRequestedStaff ? "Preferred staff selected" : "Mark this staff as preferred"}
                  >
                    <Heart
                      className="h-4 w-4"
                      strokeWidth={2.2}
                      fill={formData.customerRequestedStaff ? "currentColor" : "none"}
                    />
                  </button>
                  <Select
                    value={formData.staffId}
                    onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                  >
                    <SelectTrigger className="w-full">
                      {formData.staffId && (() => {
                        const selected = staff.find(s => s.id === formData.staffId);
                        return selected ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: selected.color }}
                            />
                            <span>{selected.name}</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select staff member" />
                        );
                      })()}
                      {!formData.staffId && <SelectValue placeholder="Select staff member" />}
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  <FifteenMinuteTimeSelect
                    className="mt-1"
                    value={format(formData.time, "HH:mm")}
                    onChange={(timeValue) => {
                      const [hours, minutes] = timeValue.split(':');
                      const newTime = new Date(formData.date.getTime());
                      newTime.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0);
                      setFormData({ ...formData, time: newTime });
                    }}
                  />
                </div>
              </div>

              <Separator className="my-4" />

              {/* Services Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Services</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openServiceSlideout}
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
                      {booking.services.map((service, index) => {
                        const serviceId = service.serviceId || service.id || '';
                        const displayPrice = Number(
                          service.price ??
                          (service as any).adjustedPrice ??
                          0
                        );
                        const catalogService = services.find((s) => s.id === serviceId);
                        const basePrice = catalogService ? Number(catalogService.price ?? 0) : undefined;
                        const priceDifference = basePrice !== undefined ? displayPrice - basePrice : 0;
                        const hasAdjustment = basePrice !== undefined && Math.abs(priceDifference) > 0.009;
                        const formattedDifference = hasAdjustment
                          ? Math.abs(priceDifference).toFixed(2)
                          : null;
                        
                        return (
                          <div
                            key={service.id || `${serviceId || 'service'}-${index}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Scissors className="h-4 w-4 text-gray-400" />
                              <span>{service.name}</span>
                              <span className="text-gray-500">({service.duration}min)</span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium">${displayPrice.toFixed(2)}</span>
                              {hasAdjustment && formattedDifference && (
                                <div className="text-xs text-orange-600">
                                  Adjusted {priceDifference > 0 ? `+$${formattedDifference}` : `-$${formattedDifference}`} from ${basePrice!.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                        <span>
                          {booking.serviceName === 'Service' && booking.totalPrice === 0
                            ? 'Service not selected'
                            : booking.serviceName}
                        </span>
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
                onClick={() => {
                  // Auto-remove "Service not selected" when editing blank booking
                  // Auto-remove "Service not selected" or blank service when editing
                  if (selectedServices.length === 1) {
                    const service = selectedServices[0];
                    const isBlankService = 
                      (service.name === 'Service not selected' || 
                       service.name === 'Service' || 
                       !service.name) && 
                      (Number(service.price || 0) === 0 && 
                       Number(service.basePrice || 0) === 0 && 
                       Number(service.adjustedPrice || 0) === 0);
                    
                    if (isBlankService) {
                      setSelectedServices([]);
                    }
                  }
                  setIsEditing(true);
                }}
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
        onOrderUpdate={(updatedOrder) => {
          // Update the selected order when modifications are made
          setSelectedOrderForPayment(updatedOrder);
          setAssociatedOrder(updatedOrder);
        }}
      />
      
      {/* Service Selection Slideout */}
      <ServiceSelectionSlideout
        isOpen={isServiceSlideoutOpen}
        onClose={() => setIsServiceSlideoutOpen(false)}
        services={services}
        onSelectService={handleAddService}
      />

      <CustomerSelectionSlideout
        isOpen={isCustomerSlideoutOpen}
        onClose={() => setIsCustomerSlideoutOpen(false)}
        onSelectCustomer={handleCustomerSelect}
        currentCustomer={currentCustomerForSelection || undefined}
        isCurrentWalkIn={editedCustomer.id === WALK_IN_CUSTOMER_ID}
      />
    </SlideOutPanel>
  );
}

// Memoize the component to prevent unnecessary re-renders when payment dialog state changes
const getServiceSignature = (services?: BookingService[] | any[]): string => {
  if (!services || services.length === 0) {
    return '';
  }

  return services
    .map((service) => {
      const id = service.id ?? service.serviceId ?? '';
      const price = Number(service.price ?? service.adjustedPrice ?? 0);
      const duration = Number(service.duration ?? 0);
      return `${id}:${price}:${duration}`;
    })
    .join('|');
};

export const BookingDetailsSlideOut = memo(
  BookingDetailsSlideOutComponent,
  (prevProps, nextProps) => {
    if (prevProps.isOpen !== nextProps.isOpen) return false;
    if (prevProps.booking?.id !== nextProps.booking?.id) return false;
    if (prevProps.booking?.status !== nextProps.booking?.status) return false;
    if (prevProps.booking?.isPaid !== nextProps.booking?.isPaid) return false;
    if (prevProps.booking?.totalPrice !== nextProps.booking?.totalPrice) return false;
    if (prevProps.booking?.paidAmount !== nextProps.booking?.paidAmount) return false;
    if (prevProps.booking?.customerRequestedStaff !== nextProps.booking?.customerRequestedStaff) return false;
    if (
      getServiceSignature(prevProps.booking?.services) !==
      getServiceSignature(nextProps.booking?.services)
    ) {
      return false;
    }
    if (prevProps.staff !== nextProps.staff) return false;
    if (prevProps.services !== nextProps.services) return false;
    return true;
  }
);
