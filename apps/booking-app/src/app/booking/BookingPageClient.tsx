"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, ChevronRight, Calendar, User, Clock, UserCircle, CheckCircle,
  Sparkles, Shield, CalendarCheck, Star, MapPin, Phone, Mail, Download,
  Zap, CalendarDays, Sun, Cloud, Moon, DollarSign, Search, LayoutGrid, List
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { RadioGroup, RadioGroupItem } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { HorizontalDatePicker } from "../../components/HorizontalDatePicker";
import { cn } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { bookingApi, type Service, type Staff, type TimeSlot, type MerchantInfo } from "../../lib/booking-api";
import { format } from "date-fns";
import { TimezoneUtils, formatName } from "@heya-pos/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CustomerIdentification } from "../../components/CustomerIdentification";
import { PaymentStep } from "../../components/PaymentStep";
import { TimeDisplay, TimezoneIndicator } from "@/components/TimeDisplay";
import { useMerchant } from "@/contexts/merchant-context";
import { useApiClient } from "@/hooks/use-api-client";


// Base steps without payment
const baseSteps = [
  { id: 1, name: "Service", icon: CheckCircle },
  { id: 2, name: "Staff", icon: User },
  { id: 3, name: "Date & Time", icon: Calendar },
  { id: 4, name: "Your Details", icon: UserCircle },
];

// Customer Form Component - Outside of BookingPage to prevent re-creation
const CustomerFormComponent = React.memo(({ 
  customerInfo, 
  onCustomerInfoChange,
  isReturningCustomer = false,
  isEditMode = false,
  onEditModeChange
}: { 
  customerInfo: any, 
  onCustomerInfoChange: (info: any) => void,
  isReturningCustomer?: boolean,
  isEditMode?: boolean,
  onEditModeChange?: (editMode: boolean) => void
}) => {
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false
  });
  
  const isFieldValid = (field: keyof typeof customerInfo) => {
    if (!touched[field as keyof typeof touched]) return false;
    if (field === 'email') {
      return customerInfo.email.includes('@') && customerInfo.email.includes('.');
    }
    if (field === 'phone') {
      return customerInfo.phone.length >= 10;
    }
    return customerInfo[field].length > 0;
  };
  
  const handleChange = (field: keyof typeof customerInfo, value: string) => {
    onCustomerInfoChange({ ...customerInfo, [field]: value });
  };
  
  // Show read-only summary for returning customers (unless in edit mode)
  if (isReturningCustomer && !isEditMode) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium mb-2">Welcome back!</h3>
          <p className="text-sm text-muted-foreground">
            We have your details on file
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {customerInfo.firstName} {customerInfo.lastName}
              </p>
              <p className="text-sm text-muted-foreground">Valued Customer</p>
            </div>
          </div>
          
          <div className="space-y-3 pt-2 border-t border-primary/10">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{customerInfo.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{customerInfo.phone}</span>
            </div>
          </div>
          
          <button
            onClick={() => onEditModeChange?.(true)}
            className="w-full mt-4 text-sm text-primary hover:text-primary/80 font-medium py-2 px-4 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
          >
            Need to update these details?
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Your information is secure and will only be used for this booking
          </p>
        </div>
      </div>
    );
  }
  
  // Show full form for new customers or when editing
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-2">
          {isReturningCustomer && isEditMode ? 'Update Your Details' : 'Almost there!'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isReturningCustomer && isEditMode
            ? 'Make any necessary changes to your information'
            : 'We just need a few details to confirm your booking'}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Input
            id="firstName"
            value={customerInfo.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            onBlur={() => setTouched({ ...touched, firstName: true })}
            className={cn(
              "peer pt-6 pb-2 transition-colors duration-200",
              isFieldValid('firstName') && "border-green-500"
            )}
            required
          />
          <Label 
            htmlFor="firstName" 
            className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none",
              customerInfo.firstName
                ? "top-2 text-xs text-muted-foreground"
                : "top-4 text-sm text-muted-foreground peer-focus:top-2 peer-focus:text-xs"
            )}
          >
            First Name *
          </Label>
          {isFieldValid('firstName') && (
            <CheckCircle className="absolute right-3 top-4 h-4 w-4 text-green-500" />
          )}
        </div>
        
        <div className="relative">
          <Input
            id="lastName"
            value={customerInfo.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            onBlur={() => setTouched({ ...touched, lastName: true })}
            className={cn(
              "peer pt-6 pb-2 transition-colors duration-200",
              isFieldValid('lastName') && "border-green-500"
            )}
            required
          />
          <Label 
            htmlFor="lastName" 
            className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none",
              customerInfo.lastName
                ? "top-2 text-xs text-muted-foreground"
                : "top-4 text-sm text-muted-foreground peer-focus:top-2 peer-focus:text-xs"
            )}
          >
            Last Name *
          </Label>
          {isFieldValid('lastName') && (
            <CheckCircle className="absolute right-3 top-4 h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
      
      <div className="relative">
        <Input
          id="email"
          type="email"
          value={customerInfo.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => setTouched({ ...touched, email: true })}
          className={cn(
            "peer pt-6 pb-2 transition-colors duration-200",
            isFieldValid('email') && "border-green-500"
          )}
          placeholder=" "
          required
        />
        <Label 
          htmlFor="email" 
          className={cn(
            "absolute left-3 transition-all duration-200 pointer-events-none",
            customerInfo.email
              ? "top-2 text-xs text-muted-foreground"
              : "top-4 text-sm text-muted-foreground peer-focus:top-2 peer-focus:text-xs"
          )}
        >
          Email Address *
        </Label>
        {isFieldValid('email') && (
          <CheckCircle className="absolute right-3 top-4 h-4 w-4 text-green-500" />
        )}
        <p className="text-xs text-muted-foreground mt-1">
          We&apos;ll send your confirmation here
        </p>
      </div>
      
      <div className="relative">
        <Input
          id="phone"
          type="tel"
          value={customerInfo.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => setTouched({ ...touched, phone: true })}
          className={cn(
            "peer pt-6 pb-2 transition-colors duration-200",
            isFieldValid('phone') && "border-green-500"
          )}
          placeholder=" "
          required
        />
        <Label 
          htmlFor="phone" 
          className={cn(
            "absolute left-3 transition-all duration-200 pointer-events-none",
            customerInfo.phone
              ? "top-2 text-xs text-muted-foreground"
              : "top-4 text-sm text-muted-foreground peer-focus:top-2 peer-focus:text-xs"
          )}
        >
          Phone Number *
        </Label>
        {isFieldValid('phone') && (
          <CheckCircle className="absolute right-3 top-4 h-4 w-4 text-green-500" />
        )}
        <p className="text-xs text-muted-foreground mt-1">
          In case we need to reach you
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          Special Requests (Optional)
        </Label>
        <Textarea
          id="notes"
          rows={3}
          value={customerInfo.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any allergies, preferences, or special requirements?"
          className="resize-none transition-colors duration-200 focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
});

CustomerFormComponent.displayName = 'CustomerFormComponent';

// Component to show selected services summary
const SelectedServicesSummary = ({ services }: { services: Service[] }) => {
  if (services.length === 0) return null;
  
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  
  return (
    <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
      <h4 className="text-sm font-semibold mb-2">Your Selected Services</h4>
      <div className="space-y-1">
        {services.map((service) => (
          <div key={service.id} className="flex justify-between text-sm">
            <span>{service.name}</span>
            <span className="text-muted-foreground">{service.duration}min - ${service.price}</span>
          </div>
        ))}
        {services.length > 1 && (
          <div className="pt-2 mt-2 border-t flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>{totalDuration}min - ${totalPrice.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};


export default function BookingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { merchantSubdomain, merchant: merchantFromContext } = useMerchant();
  const apiClient = useApiClient();

  // Helper function to clean staff names that contain "null"
  const cleanStaffName = (name: string): string => {
    return name.replace(' null', '').replace('null ', '').trim();
  };
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(merchantFromContext);
  
  // Create dynamic steps based on merchant settings
  const steps = React.useMemo(() => {
    const dynamicSteps = [...baseSteps];
    
    // Only add payment step if merchant requires deposit
    if (merchantInfo?.requireDeposit && merchantInfo?.depositPercentage > 0) {
      dynamicSteps.push({ id: 5, name: "Payment", icon: DollarSign });
    }
    
    // Always add confirmation as the last step
    const confirmationId = merchantInfo?.requireDeposit && merchantInfo?.depositPercentage > 0 ? 6 : 5;
    dynamicSteps.push({ id: confirmationId, name: "Confirmation", icon: CheckCircle });
    
    return dynamicSteps;
  }, [merchantInfo?.requireDeposit, merchantInfo?.depositPercentage]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    searchParams.get("service") ? [searchParams.get("service")!] : []
  );
  const [selectedStaff, setSelectedStaff] = useState<string | null>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    bookingId: string;
    bookingNumber: string;
    services: Service[];
    staffName: string;
    date: Date;
    time: string;
    customerName: string;
    customerEmail: string;
    totalPrice: number;
    totalDuration: number;
  } | null>(null);

  const selectedServicesList = services.filter(s => selectedServices.includes(s.id));
  const selectedStaffMember = staff.find(s => s.id === selectedStaff);

  useEffect(() => {
    // Only load data once merchant subdomain is available
    if (merchantSubdomain) {
      loadInitialData();
    }
  }, [merchantSubdomain]);

  useEffect(() => {
    if (selectedDate && selectedServices.length > 0) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedServices, selectedStaff]);

  // Track step changes and ensure confirmation data persists
  useEffect(() => {
    const confirmationStepId = steps[steps.length - 1]?.id;
    if (currentStep === confirmationStepId && !confirmationData) {
      console.warn('[BookingPageClient] WARNING: On confirmation step but no confirmationData!');
    }
  }, [currentStep, confirmationData, steps]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [merchantData, servicesData, staffData] = await Promise.all([
        bookingApi.getMerchantInfo(),
        bookingApi.getServices(),
        bookingApi.getStaff()
      ]);
      
      // Use merchant from context if available, otherwise use API response
      setMerchantInfo(merchantFromContext || merchantData);
      setServices(servicesData.filter(s => s.isActive));
      setStaff(staffData.filter(s => s.isActive));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load booking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || selectedServices.length === 0) return;
    
    try {
      setLoadingSlots(true);
      const slots = await bookingApi.checkAvailability({
        date: format(selectedDate, 'yyyy-MM-dd'),
        services: selectedServices.map(id => ({ serviceId: id })),
        staffId: selectedStaff || undefined
      });
      setAvailableSlots(slots);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load available times. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleNext = async () => {
    const lastStepBeforeConfirmation = steps[steps.length - 2].id;
    const confirmationStepId = steps[steps.length - 1].id;
    
    if (currentStep === 4) {
      // Move to payment step if deposit required, otherwise skip to booking creation
      if (merchantInfo?.requireDeposit && merchantInfo.depositPercentage > 0) {
        setCurrentStep(5); // Go to payment step
      } else {
        // Skip payment, create booking directly
        await handleBookingSubmit();
      }
    } else if (currentStep === 5 && merchantInfo?.requireDeposit) {
      // Payment step - handled by payment form submission
      return;
    } else if (currentStep < lastStepBeforeConfirmation) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBookingSubmit = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) return;
    
    // Determine staff assignment
    // When "Any Available" is selected (empty string), don't send a staffId
    // Let the API handle auto-assignment to find an actually available staff member
    let finalStaffId = selectedStaff === "" ? undefined : selectedStaff || undefined;
    
    // Create booking directly
    await createBooking({
      customerName: formatName(customerInfo.firstName, customerInfo.lastName),
      customerPhone: customerInfo.phone,
      customerEmail: customerInfo.email,
      services: selectedServices.map(id => ({ serviceId: id })),
      staffId: finalStaffId,
      date: selectedDate,
      startTime: selectedTime,
      notes: customerInfo.notes
    });
  };

  const createBooking = async (bookingData: any) => {
    try {
      setSubmitting(true);
      
      const booking = await bookingApi.createBooking(bookingData);
      
      // Store all confirmation data before changing step
      const totalPrice = selectedServicesList.reduce((sum, s) => sum + s.price, 0);
      const totalDuration = selectedServicesList.reduce((sum, s) => sum + s.duration, 0);
      
      setConfirmationData({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber || booking.id,
        services: selectedServicesList,
        staffName: selectedStaffMember ? cleanStaffName(selectedStaffMember.name) : 'Any Available',
        date: selectedDate!,
        time: selectedTime!,
        customerName: formatName(customerInfo.firstName, customerInfo.lastName),
        customerEmail: customerInfo.email,
        totalPrice,
        totalDuration,
      });
      
      setBookingId(booking.id);
      setBookingNumber(booking.bookingNumber || booking.id);
      
      console.log('[BookingPageClient] Booking created successfully, moving to confirmation step');
      // Set to the last step (confirmation), which could be 6 or 7 depending on payment requirement
      const confirmationStepId = steps[steps.length - 1].id;
      setCurrentStep(confirmationStepId);
      
      // Don't show toast - we're showing the confirmation page instead
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // If going back from customer details step, reset the form state
      if (currentStep === 4) {
        setShowCustomerForm(false);
        setIsReturningCustomer(false);
        setIsEditMode(false);
        setCustomerInfo({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          notes: "",
        });
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedServices.length > 0;
      case 2:
        // Allow empty string (Any Available) as well as specific staff selection
        // Empty string is valid for "Any Available", null/undefined means nothing selected
        return selectedStaff !== null && selectedStaff !== undefined;
      case 3:
        return !!selectedDate && !!selectedTime;
      case 4:
        return customerInfo.firstName && customerInfo.lastName && customerInfo.email && customerInfo.phone;
      case 5:
        return true; // Payment step - validation handled by payment form
      default:
        return true;
    }
  };

  const ProgressIndicator = React.memo(function ProgressIndicator() {
    const handleStepClick = (stepId: number) => {
      // Only allow navigation to completed steps or the next step
      if (stepId < currentStep || (stepId === currentStep + 1 && canProceed())) {
        // Don't allow navigation to payment or confirmation steps directly
        const lastTwoSteps = steps.slice(-2).map(s => s.id);
        if (lastTwoSteps.includes(stepId)) {
          return;
        }
        
        // Don't allow going back from customer details if returning customer
        if (currentStep === 4 && stepId < 4 && isReturningCustomer) {
          return;
        }
        
        setCurrentStep(stepId);
      }
    };
    
    return (
    <div className="mb-12">
      <div className="relative max-w-3xl mx-auto">
        {/* Background gradient line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-muted/30 rounded-full" />
        
        {/* Progress line - no animation on re-renders */}
        <div 
          className="absolute top-6 left-0 h-1 rounded-full transition-all duration-700 ease-in-out bg-gradient-to-r from-primary to-secondary"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
          }}
        />
        
        <div className="relative flex items-center justify-between">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const lastTwoSteps = steps.slice(-2).map(s => s.id);
            const isClickable = (step.id < currentStep || (step.id === currentStep + 1 && canProceed())) 
              && !lastTwoSteps.includes(step.id);
            
            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center"
              >
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
                    isActive && "bg-gradient-to-r from-primary to-secondary shadow-lg scale-125",
                    isCompleted && "bg-gradient-to-r from-primary/80 to-secondary/80",
                    !isActive && !isCompleted && "bg-muted",
                    isClickable && "cursor-pointer hover:scale-110",
                    !isClickable && "cursor-not-allowed"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    (isActive || isCompleted) ? "text-white" : "text-gray-400"
                  )} />
                </button>
                <span
                  className={cn(
                    "text-xs mt-3 font-medium transition-all duration-300 hidden sm:block select-none",
                    isActive && "text-primary font-semibold scale-110",
                    isCompleted && "text-primary/80",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    );
  });

  const ServiceSelection = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="shimmer h-20 w-20 rounded-full mx-auto" />
            <p className="text-foreground/60 font-light">Preparing your experience...</p>
          </div>
        </div>
      );
    }
    
    // Get unique categories
    const categories = Array.from(new Set(services.map(s => s.categoryName).filter(Boolean)));
    
    // Filter services
    const filteredServices = services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || service.categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    
    // Group services by category
    const groupedServices = filteredServices.reduce((acc, service) => {
      const category = service.categoryName || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(service);
      return acc;
    }, {} as Record<string, typeof services>);
    
    return (
      <div className="space-y-4">
        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-9"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Category Pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All Services
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        
        {/* Services Display */}
        <div>
          {viewMode === 'grid' ? (
            <div className="space-y-6">
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category}>
                  {categories.length > 1 && (
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {categoryServices.map((service, index) => {
                      const isSelected = selectedServices.includes(service.id);
                      
                      return (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ y: -2 }}
                        >
                          <div
                            className={cn(
                              "relative cursor-pointer rounded-lg border-2 transition-all duration-200",
                              "hover:shadow-md",
                              isSelected 
                                ? "border-primary bg-primary/5 shadow-md" 
                                : "border-border bg-card hover:border-border/80"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedServices(selectedServices.filter(id => id !== service.id));
                              } else {
                                setSelectedServices([...selectedServices, service.id]);
                              }
                            }}
                          >
                            <div className="p-4">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-base leading-tight mb-1">
                                    {service.name}
                                  </h4>
                                  {service.categoryName && (
                                    <Badge variant="secondary" className="text-xs">
                                      {service.categoryName}
                                    </Badge>
                                  )}
                                </div>
                                <Checkbox 
                                  checked={isSelected}
                                  className="mt-0.5" 
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              
                              {/* Footer */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="text-sm">{service.duration}min</span>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">
                                  ${service.price}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category}>
                  {categories.length > 1 && (
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      {category}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {categoryServices.map((service) => {
                      const isSelected = selectedServices.includes(service.id);
                      
                      return (
                        <div
                          key={service.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                            isSelected 
                              ? "bg-primary/5 border-2 border-primary" 
                              : "bg-card border-2 border-border hover:border-border/80"
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedServices(selectedServices.filter(id => id !== service.id));
                            } else {
                              setSelectedServices([...selectedServices, service.id]);
                            }
                          }}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{service.name}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{service.duration}min</span>
                            <span className="font-semibold text-gray-900">${service.price}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="font-semibold text-sm mb-3">Selected Services ({selectedServices.length})</h3>
            <div className="space-y-2">
              {selectedServicesList.map((service) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{service.name}</span>
                    <span className="text-xs text-muted-foreground">{service.duration}min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">${service.price}</span>
                    <button
                      onClick={() => setSelectedServices(selectedServices.filter(id => id !== service.id))}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <div className="text-right">
                    <div>${selectedServicesList.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {selectedServicesList.reduce((sum, s) => sum + s.duration, 0)} minutes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No services found matching your search.</p>
          </div>
        )}
      </div>
    );
  };

  const StaffSelection = () => {
    const availableStaff = selectedServicesList.length > 0
      ? staff.filter(s => !s.services || s.services.length === 0 || 
          selectedServicesList.some(service => s.services.includes(service.id)))
      : staff;

    return (
      <RadioGroup 
        value={selectedStaff || ""} 
        onValueChange={setSelectedStaff}
        defaultValue=""
      >
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <label htmlFor="any-available-radio">
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                  selectedStaff === "" && "ring-2 ring-primary shadow-lg"
                )}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      Any Available
                      <Badge variant="secondary" className="text-xs">Smart Match</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {merchantInfo?.allowUnassignedBookings 
                        ? "We'll assign the best available specialist for your service"
                        : "We'll automatically assign an available specialist"}
                    </p>
                  </div>
                  <motion.div
                    animate={selectedStaff === "" ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <RadioGroupItem id="any-available-radio" value="" className="data-[state=checked]:border-primary" />
                  </motion.div>
                </div>
              </CardHeader>
            </Card>
            </label>
          </motion.div>
          
          {availableStaff.map((member, index) => {
            const isSelected = selectedStaff === member.id;
            
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.1 }}
              >
                <label htmlFor={`staff-${member.id}`}>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative",
                      isSelected && "ring-2 ring-primary shadow-lg"
                    )}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                        {cleanStaffName(member.name).split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium">{cleanStaffName(member.name)}</CardTitle>
                      </div>
                      <motion.div
                        animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <RadioGroupItem id={`staff-${member.id}`} value={member.id} className="data-[state=checked]:border-primary" />
                      </motion.div>
                    </div>
                  </CardHeader>
                </Card>
                </label>
              </motion.div>
            );
          })}
        </div>
      </RadioGroup>
    );
  };

  const DateTimeSelection = () => {
    // Group time slots by period
    const groupTimeSlots = (slots: TimeSlot[]) => {
      const groups = {
        morning: [] as TimeSlot[],
        afternoon: [] as TimeSlot[],
        evening: [] as TimeSlot[]
      };
      
      slots.forEach(slot => {
        const hour = parseInt(slot.time.split(':')[0]);
        if (hour < 12) {
          groups.morning.push(slot);
        } else if (hour < 17) {
          groups.afternoon.push(slot);
        } else {
          groups.evening.push(slot);
        }
      });
      
      return groups;
    };
    
    const groupedSlots = selectedDate ? groupTimeSlots(availableSlots) : null;
    const hasAvailableSlots = availableSlots.some(slot => slot.available);
    
    // Find next available slot
    const nextAvailable = availableSlots.find(slot => slot.available);
    
    // Calculate appointment end time
    const getEndTime = (startTime: string) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalDuration = selectedServicesList.reduce((sum, s) => sum + s.duration, 0) || 60;
      const endHours = Math.floor((hours * 60 + minutes + totalDuration) / 60);
      const endMinutes = (hours * 60 + minutes + totalDuration) % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };
    
    return (
      <div className="space-y-8">
        {/* Context Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Selected Treatment{selectedServicesList.length > 1 ? 's' : ''}</p>
                <p className="font-display text-lg font-medium">
                  {selectedServicesList.length > 0 
                    ? selectedServicesList.map(s => s.name).join(' + ')
                    : 'No services selected'}
                </p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">With</p>
                <p className="font-medium">{selectedStaffMember ? cleanStaffName(selectedStaffMember.name) : 'Any Available Specialist'}</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Duration</p>
                <p className="font-medium">
                  {selectedServicesList.reduce((sum, s) => sum + s.duration, 0)} minutes
                </p>
              </div>
            </div>
            {nextAvailable && !selectedTime && (
              <Button
                onClick={() => {
                  if (!selectedDate) {
                    setSelectedDate(new Date());
                  }
                  setSelectedTime(nextAvailable.time);
                }}
                className="btn-luxury text-white rounded-full px-6 py-2"
              >
                <Zap className="h-4 w-4 mr-2" />
                Book Next Available
              </Button>
            )}
          </div>
        </motion.div>

        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h3 className="font-display text-2xl font-semibold mb-2">Choose Your Perfect Time</h3>
            <p className="text-muted-foreground">Select a date to see available appointment times</p>
            {(merchantInfo?.settings?.bookingAdvanceHours || merchantInfo?.settings?.minimumBookingNotice) && (
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                {merchantInfo?.settings?.bookingAdvanceHours && (
                  <p>
                    Bookings can be made up to {merchantInfo.settings.bookingAdvanceHours > 168 
                      ? `${Math.floor(merchantInfo.settings.bookingAdvanceHours / 168)} weeks` 
                      : merchantInfo.settings.bookingAdvanceHours > 24 
                      ? `${Math.floor(merchantInfo.settings.bookingAdvanceHours / 24)} days`
                      : `${merchantInfo.settings.bookingAdvanceHours} hours`} in advance
                  </p>
                )}
                {merchantInfo?.settings?.minimumBookingNotice > 0 && (
                  <p>
                    Minimum notice required: {merchantInfo.settings.minimumBookingNotice >= 1440
                      ? `${Math.floor(merchantInfo.settings.minimumBookingNotice / 1440)} day${Math.floor(merchantInfo.settings.minimumBookingNotice / 1440) > 1 ? 's' : ''}`
                      : merchantInfo.settings.minimumBookingNotice >= 60
                      ? `${Math.floor(merchantInfo.settings.minimumBookingNotice / 60)} hour${Math.floor(merchantInfo.settings.minimumBookingNotice / 60) > 1 ? 's' : ''}`
                      : `${merchantInfo.settings.minimumBookingNotice} minute${merchantInfo.settings.minimumBookingNotice > 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="w-full flex justify-center">
            <HorizontalDatePicker
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime(null); // Reset time when date changes
              }}
              maxAdvanceDays={(() => {
                // Calculate max advance days based on merchant settings
                const settings = merchantInfo?.settings || {};
                const bookingAdvanceHours = settings.bookingAdvanceHours || 168; // Default 7 days
                let maxDays = Math.ceil(bookingAdvanceHours / 24);
                
                // Apply service-specific max advance booking if available
                for (const service of selectedServicesList) {
                  if (service.maxAdvanceBooking && service.maxAdvanceBooking < maxDays) {
                    maxDays = service.maxAdvanceBooking;
                  }
                }
                
                return Math.min(maxDays, 60); // Cap at 60 days for UI performance
              })()}
              disabledDates={(date) => {
                // Get today's start of day in merchant timezone
                const today = merchantInfo ? 
                  TimezoneUtils.startOfDayInTimezone(new Date(), merchantInfo.timezone) :
                  new Date();
                
                // Compare the date's start of day with today's start of day in merchant timezone
                const dateStartOfDay = merchantInfo ?
                  TimezoneUtils.startOfDayInTimezone(date, merchantInfo.timezone) :
                  new Date(date.getFullYear(), date.getMonth(), date.getDate());
                
                // Disable dates in the past
                if (dateStartOfDay < today) {
                  return true;
                }
                
                // Apply advance booking limit from merchant settings
                if (merchantInfo?.settings?.bookingAdvanceHours) {
                  // Get current time in UTC
                  const now = new Date();
                  
                  // Add the advance booking hours
                  const maxDateUTC = new Date(now.getTime() + (merchantInfo.settings.bookingAdvanceHours * 60 * 60 * 1000));
                  
                  // Convert both dates to start of day in merchant timezone for comparison
                  const dateStartOfDay = TimezoneUtils.startOfDayInTimezone(date, merchantInfo.timezone);
                  const maxDateStartOfDay = TimezoneUtils.startOfDayInTimezone(maxDateUTC, merchantInfo.timezone);
                  
                  // If the selected date is after the max allowed date, disable it
                  if (dateStartOfDay.getTime() > maxDateStartOfDay.getTime()) {
                    return true;
                  }
                }
                
                // Apply service-specific max advance booking if available
                for (const service of selectedServicesList) {
                  if (service.maxAdvanceBooking) {
                    const maxServiceDate = new Date(today);
                    maxServiceDate.setDate(maxServiceDate.getDate() + service.maxAdvanceBooking);
                    if (date > maxServiceDate) {
                      return true;
                    }
                  }
                }
                
                return false;
              }}
              className="max-w-5xl mx-auto"
            />
          </div>
        </motion.div>

        {/* Time Slots Section */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="font-display text-xl font-semibold mb-2">
                  Available Times for {merchantInfo ? 
                    TimezoneUtils.formatInTimezone(selectedDate, merchantInfo.timezone, 'EEEE, MMMM d') : 
                    format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                {loadingSlots ? (
                  <p className="text-muted-foreground">Checking availability...</p>
                ) : hasAvailableSlots ? (
                  <>
                    <p className="text-muted-foreground mb-3">Select your preferred appointment time</p>
                    <div className="flex justify-center">
                      <TimezoneIndicator />
                    </div>
                  </>
                ) : (
                  <p className="text-amber-600">No availability on this date - please try another</p>
                )}
              </div>

              {loadingSlots ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-12"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">Loading available times...</p>
                </motion.div>
              ) : hasAvailableSlots ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  {Object.entries(groupedSlots!).map(([period, slots]) => {
                    if (slots.length === 0) return null;
                    
                    const periodConfig = {
                      morning: { 
                        icon: Sun, 
                        gradient: 'from-amber-50 to-orange-50',
                        label: 'Morning',
                        description: 'Start your day refreshed'
                      },
                      afternoon: { 
                        icon: Cloud, 
                        gradient: 'from-blue-50 to-teal-50',
                        label: 'Afternoon',
                        description: 'Perfect midday escape'
                      },
                      evening: { 
                        icon: Moon, 
                        gradient: 'from-primary/5 to-secondary/5',
                        label: 'Evening',
                        description: 'Unwind after your day'
                      }
                    };
                    
                    const config = periodConfig[period as keyof typeof periodConfig];
                    const Icon = config.icon;
                    
                    return (
                      <motion.div
                        key={period}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-6`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-gray-700" />
                          </div>
                          <div>
                            <h4 className="font-display text-lg font-medium">{config.label}</h4>
                            <p className="text-sm text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {slots.map((slot) => {
                            const isSelected = selectedTime === slot.time;
                            const endTime = getEndTime(slot.time);
                            
                            return (
                              <motion.div
                                key={slot.time}
                                whileHover={slot.available ? { scale: 1.05, y: -2 } : {}}
                                whileTap={slot.available ? { scale: 0.98 } : {}}
                              >
                                <button
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={cn(
                                    "w-full p-4 rounded-xl transition-all duration-300 relative group",
                                    slot.available && !isSelected && "bg-card hover:shadow-lg hover:shadow-primary/20",
                                    slot.available && isSelected && "bg-gradient-to-r from-primary to-secondary text-white shadow-lg",
                                    !slot.available && "bg-gray-100 cursor-not-allowed opacity-50"
                                  )}
                                >
                                  <div className="text-lg font-medium">
                                    {slot.time}
                                  </div>
                                  <div className={cn(
                                    "text-xs mt-1",
                                    isSelected ? "text-white/80" : "text-muted-foreground"
                                  )}>
                                    {slot.available ? `until ${endTime}` : 'Unavailable'}
                                  </div>
                                  
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute inset-0 rounded-xl ring-4 ring-primary/30 ring-offset-2"
                                    />
                                  )}
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-4">
                    We&apos;re fully booked on {format(selectedDate, 'MMMM d')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try selecting another date or use the &quot;Book Next Available&quot; option above
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // CustomerForm removed - replaced with CustomerFormComponent above
  
  /* Old CustomerForm code removed - the component is now defined outside BookingPage
   * to prevent re-creation on every render which was causing focus loss */

  const Confirmation = () => {
    // Use confirmationData for a more stable confirmation page
    if (!confirmationData) {
      console.log('[Confirmation] No confirmation data available');
      // If we somehow get here without data, show a generic success message
      return (
        <div className="text-center py-12">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground mb-4">Your appointment has been successfully booked.</p>
          <p className="text-sm text-muted-foreground">Confirmation details have been sent to your email.</p>
          <Button
            className="mt-6"
            onClick={() => {
              // Reset and go back to start
              setCurrentStep(1);
              setSelectedServices([]);
              setSelectedStaff("");
              setSelectedDate(undefined);
              setSelectedTime(null);
              setCustomerInfo({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                notes: "",
              });
              setBookingId(null);
              setBookingNumber(null);
              setConfirmationData(null);
              setIsReturningCustomer(false);
              setShowCustomerForm(false);
              setIsEditMode(false);
            }}
          >
            Book Another Appointment
          </Button>
        </div>
      );
    }
    
    const businessPhone = merchantInfo?.phone || "";
    const businessEmail = merchantInfo?.email || "";
    const businessAddress = merchantInfo?.address || "";
    
    // Extract customer first name from confirmationData
    const customerFirstName = confirmationData.customerName.split(' ')[0];
    
    const handleAddToCalendar = () => {
      // Create calendar event details
      const serviceNames = confirmationData.services.map(s => s.name).join(' + ');
      
      const eventDetails = {
        text: `${serviceNames} at ${merchantInfo?.name || 'Luxe Spa'}`,
        dates: `${format(confirmationData.date, 'yyyyMMdd')}T${confirmationData.time.replace(':', '')}00/${format(confirmationData.date, 'yyyyMMdd')}T${confirmationData.time.replace(':', '')}00`,
        details: `Booking ID: ${confirmationData.bookingId}\nStaff: ${confirmationData.staffName}\nDuration: ${confirmationData.totalDuration} minutes`,
        location: businessAddress
      };
      
      // Google Calendar URL
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.text)}&dates=${eventDetails.dates}&details=${encodeURIComponent(eventDetails.details)}&location=${encodeURIComponent(eventDetails.location)}`;
      window.open(googleUrl, '_blank');
    };
    
    return (
      <motion.div 
        className="max-w-lg mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Success Animation */}
        <motion.div 
          className="text-center mb-8"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1 
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4 relative" />
            </div>
          </motion.div>
          
          <motion.h2 
            className="text-2xl font-display font-bold mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            You&apos;re All Set!
          </motion.h2>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            We can&apos;t wait to see you, {customerFirstName}!
          </motion.p>
        </motion.div>
        
        {/* Receipt-style Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg border-t-4 border-t-primary">
            <CardHeader className="text-center pb-2">
              <Badge variant="secondary" className="mb-2 mx-auto">
                {confirmationData.bookingNumber}
              </Badge>
              <CardTitle className="text-lg font-display">Appointment Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground mb-2">Services</p>
                <div className="space-y-2">
                  {confirmationData.services.map((svc, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{svc.name}</p>
                        <p className="text-sm text-muted-foreground">{svc.duration} minutes</p>
                      </div>
                      <p className="font-semibold">${svc.price}</p>
                    </div>
                  ))}
                  {confirmationData.services.length > 1 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">Total</p>
                          <p className="text-sm text-muted-foreground">
                            {confirmationData.totalDuration} minutes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            ${confirmationData.totalPrice.toFixed(2)}
                          </p>
                          {merchantInfo?.requireDeposit && merchantInfo.depositPercentage > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Deposit paid: ${Math.round(confirmationData.totalPrice * (merchantInfo.depositPercentage / 100) * 100) / 100}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {merchantInfo ? 
                      TimezoneUtils.formatInTimezone(confirmationData.date, merchantInfo.timezone, 'EEEE, MMMM d, yyyy') :
                      confirmationData.date.toLocaleDateString("en-US", { 
                        weekday: "long", 
                        month: "long", 
                        day: "numeric" 
                      })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    at <TimeDisplay 
                      date={`${format(confirmationData.date, 'yyyy-MM-dd')}T${confirmationData.time}:00`} 
                      format="time" 
                      showTimezone={true} 
                    />
                  </p>
                </div>
              </div>
              
              {/* Staff */}
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{confirmationData.staffName}</p>
                  <p className="text-sm text-muted-foreground">{confirmationData.totalDuration} minute session</p>
                </div>
              </div>
              
              {/* Divider */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">What&apos;s Next?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <p>Confirmation email sent to {confirmationData.customerEmail}</p>
                  </div>
                  {(merchantInfo?.settings?.appointmentReminder24hEmail || 
                    merchantInfo?.settings?.appointmentReminder24hSms ||
                    merchantInfo?.settings?.appointmentReminder2hEmail ||
                    merchantInfo?.settings?.appointmentReminder2hSms) && (
                    <div className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>
                        {(() => {
                          const reminders = [];
                          if (merchantInfo?.settings?.appointmentReminder24hEmail || merchantInfo?.settings?.appointmentReminder24hSms) {
                            reminders.push('24 hours');
                          }
                          if (merchantInfo?.settings?.appointmentReminder2hEmail || merchantInfo?.settings?.appointmentReminder2hSms) {
                            reminders.push('2 hours');
                          }
                          
                          if (reminders.length === 0) {
                            return null;
                          } else if (reminders.length === 1) {
                            return `We'll send a reminder ${reminders[0]} before`;
                          } else {
                            return `We'll send reminders ${reminders.join(' and ')} before`;
                          }
                        })()}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <p>Arrive 10 minutes early for check-in</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div 
          className="mt-6 space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button 
            className="w-full gap-2"
            onClick={handleAddToCalendar}
          >
            <CalendarDays className="h-4 w-4" />
            Add to Calendar
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            {businessAddress && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(businessAddress)}`, '_blank')}
              >
                <MapPin className="h-4 w-4" />
                Get Directions
              </Button>
            )}
            <Button
              variant="outline"
              className={cn("gap-2", !businessAddress && "col-span-2")}
              onClick={() => window.print()}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              // Reset form
              setCurrentStep(1);
              setSelectedServices([]);
              setSelectedStaff("");
              setSelectedDate(undefined);
              setSelectedTime(null);
              setCustomerInfo({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                notes: "",
              });
              setBookingId(null);
              setBookingNumber(null);
              setConfirmationData(null);
              setIsReturningCustomer(false);
              setShowCustomerForm(false);
              setIsEditMode(false);
            }}
          >
            Book Another Appointment
          </Button>
        </motion.div>
        
        {/* Contact Info */}
        {(businessPhone || businessEmail || businessAddress) && (
          <motion.div 
            className="mt-8 text-center space-y-2 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="font-medium">Need to make changes?</p>
            <div className="flex items-center justify-center gap-4">
              {businessPhone && (
                <a href={`tel:${businessPhone}`} className="flex items-center gap-1 hover:text-primary">
                  <Phone className="h-4 w-4" />
                  {businessPhone}
                </a>
              )}
              {businessEmail && (
                <a href={`mailto:${businessEmail}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail className="h-4 w-4" />
                  {businessEmail}
                </a>
              )}
            </div>
            {businessAddress && <p className="text-xs">{businessAddress}</p>}
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen spa-pattern">
      {/* Luxurious Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white z-10" />
          <div 
            className="h-full w-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1920&q=80')`,
              filter: 'blur(2px)'
            }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 py-20">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground/90 tracking-tight">
              {merchantInfo?.name || merchantFromContext?.name || ''}
            </h1>
            <p className="text-lg md:text-xl text-foreground/70 font-light mb-12">
              Where luxury meets tranquility
            </p>
            
            {/* Elegant Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm">
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground/60">Instant Confirmation</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground/60">Secure Booking</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground/60">Flexible Scheduling</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative -mt-10 z-30">
        <div className="container mx-auto px-4">

          <ProgressIndicator />

          <div className="max-w-5xl mx-auto">
            <Card className="luxury-card border-0">
              <CardHeader className="text-center pb-8 pt-10">
                <CardTitle className="font-display text-2xl md:text-3xl font-semibold mb-3">
                  {currentStep === 1 && "Select Your Treatment"}
                  {currentStep === 2 && "Choose Your Specialist"}
                  {currentStep === 3 && "Schedule Your Visit"}
                  {currentStep === 4 && "Your Information"}
                  {currentStep === 5 && merchantInfo?.requireDeposit && "Secure Payment"}
                  {currentStep === 5 && !merchantInfo?.requireDeposit && `Welcome to ${merchantInfo?.name || merchantFromContext?.name || ''}`}
                  {currentStep === 6 && `Welcome to ${merchantInfo?.name || merchantFromContext?.name || ''}`}
                </CardTitle>
                <CardDescription className="text-lg text-foreground/60 max-w-2xl mx-auto">
                  {currentStep === 1 && "Indulge in our curated collection of rejuvenating treatments"}
                  {currentStep === 2 && "Our expert therapists are here to provide you with an exceptional experience"}
                  {currentStep === 3 && "Find the perfect time for your moment of relaxation"}
                  {currentStep === 4 && "Just a few details to secure your appointment"}
                  {currentStep === 5 && merchantInfo?.requireDeposit && "Pay deposit to secure your booking"}
                  {currentStep === 5 && !merchantInfo?.requireDeposit && "Your journey to wellness begins here"}
                  {currentStep === 6 && "Your journey to wellness begins here"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentStep === 4 ? (
                  // Progressive customer details step
                  <>
                    <SelectedServicesSummary services={selectedServicesList} />
                    {/* Show identification first, then form based on result */}
                    {!showCustomerForm ? (
                      <CustomerIdentification
                        onCustomerFound={(customer) => {
                          setIsReturningCustomer(true);
                          setCustomerInfo({
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            email: customer.email,
                            phone: customer.phone,
                            notes: customerInfo.notes,
                          });
                          setShowCustomerForm(true);
                        }}
                        onNewCustomer={() => {
                          setIsReturningCustomer(false);
                          setShowCustomerForm(true);
                        }}
                      />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Back to identification button */}
                        <button
                          onClick={() => {
                            setShowCustomerForm(false);
                            setIsReturningCustomer(false);
                            setIsEditMode(false);
                            // Keep email if they entered it
                            setCustomerInfo({
                              ...customerInfo,
                              firstName: "",
                              lastName: "",
                              phone: "",
                              notes: "",
                            });
                          }}
                          className="mb-6 text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back to identification
                        </button>
                        <CustomerFormComponent 
                          customerInfo={customerInfo} 
                          onCustomerInfoChange={setCustomerInfo}
                          isReturningCustomer={isReturningCustomer}
                          isEditMode={isEditMode}
                          onEditModeChange={setIsEditMode}
                        />
                      </motion.div>
                    )}
                  </>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: currentStep > 1 ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: currentStep > 1 ? -20 : 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {currentStep === 1 && <ServiceSelection />}
                      {currentStep === 2 && (
                        <>
                          <SelectedServicesSummary services={selectedServicesList} />
                          <StaffSelection />
                        </>
                      )}
                      {currentStep === 3 && (
                        <>
                          <SelectedServicesSummary services={selectedServicesList} />
                          <DateTimeSelection />
                        </>
                      )}
                      {currentStep === 5 && merchantInfo?.requireDeposit && selectedServicesList.length > 0 && (
                        <>
                          <SelectedServicesSummary services={selectedServicesList} />
                        <PaymentStep
                          amount={Math.round(selectedServicesList.reduce((sum, s) => sum + s.price, 0) * (merchantInfo?.depositPercentage || 0) / 100 * 100) / 100}
                          currency={merchantInfo?.currency || 'AUD'}
                          onPaymentSuccess={handleBookingSubmit}
                          onCancel={() => setCurrentStep(4)}
                          services={selectedServicesList}
                          date={selectedDate!}
                          time={selectedTime!}
                          staffName={selectedStaffMember ? cleanStaffName(selectedStaffMember.name) : 'Any Available'}
                          customerName={formatName(customerInfo.firstName, customerInfo.lastName)}
                          cancellationHours={merchantInfo?.settings?.cancellationHours}
                        />
                        </>
                      )}
                      {((currentStep === 5 && !merchantInfo?.requireDeposit) || currentStep === 6) && <Confirmation />}
                    </motion.div>
                  </AnimatePresence>
                )}

                  {/* Add padding to prevent content from being hidden behind sticky footer */}
                  {currentStep === 1 && <div className="h-24" />}
                  
                  {/* Regular navigation for non-service selection steps */}
                  {(() => {
                    const lastStepId = steps[steps.length - 1].id;
                    const paymentStepExists = steps.some(s => s.name === "Payment");
                    const paymentStepId = paymentStepExists ? 5 : null;
                    
                    return currentStep < lastStepId && currentStep !== paymentStepId && currentStep !== 1;
                  })() && (
                    <div className="flex justify-between mt-12 px-2">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Button
                          variant="outline"
                          onClick={handleBack}
                          disabled={currentStep === 1}
                          className="group px-6 py-3 rounded-full border-2 hover:border-primary/50 transition-all duration-300"
                        >
                          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          <span className="font-medium">Back</span>
                        </Button>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Button
                          onClick={handleNext}
                          disabled={!canProceed() || submitting}
                          className="btn-luxury px-8 py-3 rounded-full text-white font-medium group disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <motion.div
                                className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Processing...
                            </>
                          ) : (
                            <>
                              {currentStep === 4 ? "Complete Booking" : "Continue"}
                              <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Sticky footer for service selection - Outside of Card to be truly fixed */}
      {currentStep === 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="group px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 hover:border-primary/50 transition-all duration-300"
                >
                  <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="font-medium text-sm sm:text-base">Back</span>
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || submitting}
                  className="btn-luxury px-6 sm:px-8 py-2 sm:py-3 rounded-full text-white font-medium group disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <motion.div
                        className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="text-sm sm:text-base">
                        Continue
                        {selectedServices.length > 0 && (
                          <span className="ml-1">({selectedServices.length} selected)</span>
                        )}
                      </span>
                      <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}