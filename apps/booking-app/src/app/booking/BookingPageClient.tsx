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
import { Calendar as CalendarComponent } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { bookingApi, type Service, type Staff, type TimeSlot, type MerchantInfo } from "../../lib/booking-api";
import { format } from "date-fns";
import { TimezoneUtils } from "@heya-pos/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CustomerIdentification } from "../../components/CustomerIdentification";
import { PaymentStep } from "../../components/PaymentStep";
import { TimeDisplay, TimezoneIndicator } from "@/components/TimeDisplay";


const steps = [
  { id: 1, name: "Service", icon: CheckCircle },
  { id: 2, name: "Staff", icon: User },
  { id: 3, name: "Date & Time", icon: Calendar },
  { id: 4, name: "Identify", icon: UserCircle },
  { id: 5, name: "Your Details", icon: UserCircle },
  { id: 6, name: "Payment", icon: DollarSign },
  { id: 7, name: "Confirmation", icon: CheckCircle },
];

// Customer Form Component - Outside of BookingPage to prevent re-creation
const CustomerFormComponent = React.memo(({ 
  customerInfo, 
  onCustomerInfoChange,
  isReturningCustomer = false
}: { 
  customerInfo: any, 
  onCustomerInfoChange: (info: any) => void,
  isReturningCustomer?: boolean
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
  
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-2">
          {isReturningCustomer ? 'Welcome back!' : 'Almost there!'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isReturningCustomer 
            ? 'Please confirm your details are correct'
            : 'We just need a few details to confirm your booking'}
        </p>
      </div>

      {/* Show simplified view for returning customers */}
      {isReturningCustomer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900">Your Information:</p>
            <p className="text-sm text-blue-800">
              {customerInfo.firstName} {customerInfo.lastName}
            </p>
            <p className="text-sm text-blue-800">{customerInfo.email}</p>
            <p className="text-sm text-blue-800">{customerInfo.phone}</p>
          </div>
          <button
            onClick={() => setTouched({ firstName: true, lastName: true, email: true, phone: true })}
            className="text-sm text-blue-600 hover:text-blue-800 underline mt-3"
          >
            Need to update these details?
          </button>
        </div>
      )}
      
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
          We'll send your confirmation here
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

export default function BookingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(searchParams.get("service"));
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);

  const service = services.find(s => s.id === selectedService);
  const selectedStaffMember = staff.find(s => s.id === selectedStaff);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedStaff]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [merchantData, servicesData, staffData] = await Promise.all([
        bookingApi.getMerchantInfo(),
        bookingApi.getServices(),
        bookingApi.getStaff()
      ]);
      
      setMerchantInfo(merchantData);
      console.log('Merchant timezone:', merchantData.timezone);
      setServices(servicesData.filter(s => s.isActive));
      setStaff(staffData.filter(s => s.isActive));
    } catch (error) {
      console.error('Failed to load data:', error);
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
    if (!selectedDate || !selectedService) return;
    
    try {
      const slots = await bookingApi.checkAvailability({
        date: format(selectedDate, 'yyyy-MM-dd'),
        serviceId: selectedService,
        staffId: selectedStaff || undefined
      });
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep === 5) {
      // Move to payment step if deposit required, otherwise skip to booking creation
      if (merchantInfo?.requireDeposit && merchantInfo.depositPercentage > 0) {
        setCurrentStep(6); // Go to payment step
      } else {
        // Skip payment, create booking directly
        await handleBookingSubmit();
      }
    } else if (currentStep === 6) {
      // Payment step - handled by payment form submission
      return;
    } else if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBookingSubmit = async () => {
    if (!service || !selectedDate || !selectedTime) return;
    
    // Create booking directly
    await createBooking({
      customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
      customerPhone: customerInfo.phone,
      customerEmail: customerInfo.email,
      serviceId: service.id,
      staffId: selectedStaff || undefined,
      date: selectedDate,
      startTime: selectedTime,
      notes: customerInfo.notes
    });
  };

  const createBooking = async (bookingData: any) => {
    try {
      setSubmitting(true);
      
      const booking = await bookingApi.createBooking(bookingData);
      
      setBookingId(booking.id);
      setBookingNumber(booking.bookingNumber || booking.id);
      setCurrentStep(7); // Go to confirmation step
      
      // Don't show toast - we're showing the confirmation page instead
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedService;
      case 2:
        return !!selectedStaff;
      case 3:
        return !!selectedDate && !!selectedTime;
      case 4:
        return true; // Customer identification step - always can proceed
      case 5:
        return customerInfo.firstName && customerInfo.lastName && customerInfo.email && customerInfo.phone;
      case 6:
        return true; // Payment step - validation handled by payment form
      default:
        return true;
    }
  };

  const ProgressIndicator = React.memo(() => (
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
            
            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                    isActive && "bg-gradient-to-r from-primary to-secondary shadow-lg scale-125",
                    isCompleted && "bg-gradient-to-r from-primary/80 to-secondary/80",
                    !isActive && !isCompleted && "bg-muted"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    (isActive || isCompleted) ? "text-white" : "text-gray-400"
                  )} />
                </div>
                <span
                  className={cn(
                    "text-xs mt-3 font-medium transition-all duration-300 hidden sm:block",
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
  ));

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
        <RadioGroup value={selectedService || ""} onValueChange={setSelectedService}>
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
                      const isSelected = selectedService === service.id;
                      
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
                            onClick={() => setSelectedService(service.id)}
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
                                <RadioGroupItem 
                                  value={service.id} 
                                  className="mt-0.5 data-[state=checked]:border-primary data-[state=checked]:text-primary" 
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
                      const isSelected = selectedService === service.id;
                      
                      return (
                        <div
                          key={service.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                            isSelected 
                              ? "bg-primary/5 border-2 border-primary" 
                              : "bg-card border-2 border-border hover:border-border/80"
                          )}
                          onClick={() => setSelectedService(service.id)}
                        >
                          <RadioGroupItem 
                            value={service.id} 
                            className="data-[state=checked]:border-primary data-[state=checked]:text-primary" 
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
        </RadioGroup>
        
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No services found matching your search.</p>
          </div>
        )}
      </div>
    );
  };

  const StaffSelection = () => {
    const availableStaff = service 
      ? staff.filter(s => !s.services || s.services.length === 0 || s.services.includes(service.id))
      : staff;

    // Mock recommended staff (in real app, based on ratings/availability)
    const recommendedStaffId = availableStaff[0]?.id;

    return (
      <RadioGroup value={selectedStaff || ""} onValueChange={setSelectedStaff}>
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                selectedStaff === "" && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => setSelectedStaff("")}
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
                      We&apos;ll assign the best available specialist for your service
                    </p>
                  </div>
                  <motion.div
                    animate={selectedStaff === "" ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <RadioGroupItem value="" className="data-[state=checked]:border-primary" />
                  </motion.div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>
          
          {availableStaff.map((member, index) => {
            const isRecommended = member.id === recommendedStaffId;
            const isSelected = selectedStaff === member.id;
            
            // Mock specialties
            const specialties = ["Color Specialist", "Senior Stylist", "Nail Artist", "Massage Therapist"];
            const specialty = specialties[index % specialties.length];
            
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.1 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative",
                    isSelected && "ring-2 ring-primary shadow-lg"
                  )}
                  onClick={() => setSelectedStaff(member.id)}
                >
                  {isRecommended && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md">
                        <Star className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium">{member.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{specialty}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn(
                                "h-3 w-3",
                                i < 4 ? "fill-amber-400 text-amber-400" : "text-gray-300"
                              )} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">4.8</span>
                        </div>
                      </div>
                      <motion.div
                        animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <RadioGroupItem value={member.id} className="data-[state=checked]:border-primary" />
                      </motion.div>
                    </div>
                  </CardHeader>
                </Card>
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
      const endHours = Math.floor((hours * 60 + minutes + (service?.duration || 60)) / 60);
      const endMinutes = (hours * 60 + minutes + (service?.duration || 60)) % 60;
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
                <p className="text-sm text-muted-foreground mb-1">Selected Treatment</p>
                <p className="font-display text-lg font-medium">{service?.name}</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">With</p>
                <p className="font-medium">{selectedStaffMember?.name || 'Any Available Specialist'}</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Duration</p>
                <p className="font-medium">{service?.duration} minutes</p>
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
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null); // Reset time when date changes
                }}
                disabled={(date) => {
                  // Get today in merchant timezone
                  const today = merchantInfo ? 
                    TimezoneUtils.startOfDayInTimezone(new Date(), merchantInfo.timezone) :
                    new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today || date.getDay() === 0;
                }}
                className="w-full max-w-[600px] mx-auto"
                classNames={{
                  months: "space-y-6",
                  month: "space-y-6 w-full",
                  caption: "flex justify-center pt-2 relative items-center mb-8",
                  caption_label: "font-display text-xl font-semibold text-gray-900",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-12 w-12 bg-card hover:bg-primary/5 rounded-full transition-all duration-200 flex items-center justify-center border border-border hover:border-primary/30 hover:scale-110",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex justify-between mb-4",
                  head_cell: "text-gray-500 font-medium text-sm w-[14.28%] flex items-center justify-center",
                  row: "flex justify-between w-full mb-3",
                  cell: cn(
                    "relative p-0 text-center text-base w-[14.28%] flex items-center justify-center",
                    "[&:has([aria-selected])]:bg-transparent",
                    "focus-within:relative focus-within:z-20"
                  ),
                  day: cn(
                    "h-14 w-14 p-0 font-normal text-base rounded-xl",
                    "transition-all duration-200",
                    "hover:bg-primary/5 hover:scale-105",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
                    "aria-selected:opacity-100"
                  ),
                  day_selected: "bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:from-primary/90 hover:to-secondary/90 shadow-lg",
                  day_today: "bg-primary/10 text-primary font-bold ring-2 ring-primary/30 ring-offset-2",
                  day_outside: "text-gray-300 opacity-50",
                  day_disabled: "text-gray-300 opacity-40 cursor-not-allowed hover:bg-transparent hover:scale-100",
                  day_hidden: "invisible",
                  day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
                }}
                components={{
                  IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5 text-gray-600" />,
                  IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5 text-gray-600" />,
                }}
              />
              
              {/* Weekend indicator */}
              <div className="mt-6 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary/10" />
                  <span className="text-gray-600">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-r from-primary to-secondary" />
                  <span className="text-gray-600">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100" />
                  <span className="text-gray-600">Unavailable</span>
                </div>
              </div>
            </div>
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
                {hasAvailableSlots ? (
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

              {hasAvailableSlots ? (
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
                            const spotsLeft = slot.available ? Math.floor(Math.random() * 4) + 1 : 0;
                            const isLastSpot = spotsLeft === 1;
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
                                  
                                  {slot.available && spotsLeft <= 2 && (
                                    <div className={cn(
                                      "absolute -top-2 -right-2 text-xs font-medium px-2 py-0.5 rounded-full",
                                      isLastSpot ? "bg-red-500 text-white animate-pulse" : "bg-amber-500 text-white"
                                    )}>
                                      {isLastSpot ? 'Last spot!' : `${spotsLeft} left`}
                                    </div>
                                  )}
                                  
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
                    We're fully booked on {format(selectedDate, 'MMMM d')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try selecting another date or use the "Book Next Available" option above
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
    const businessPhone = merchantInfo?.phone || "+1 (555) 123-4567";
    const businessEmail = merchantInfo?.email || "hello@luxespa.com";
    const businessAddress = merchantInfo?.address || "123 Main Street, Hamilton, ON L8P 1A1";
    
    const handleAddToCalendar = () => {
      // Create calendar event details
      const eventDetails = {
        text: `${service?.name} at ${merchantInfo?.name || 'Luxe Spa'}`,
        dates: selectedDate && selectedTime ? 
          `${format(selectedDate, 'yyyyMMdd')}T${selectedTime.replace(':', '')}00/${format(selectedDate, 'yyyyMMdd')}T${selectedTime.replace(':', '')}00` : '',
        details: `Booking ID: ${bookingId}\nStaff: ${selectedStaffMember?.name || 'Any Available'}\nDuration: ${service?.duration} minutes`,
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
            You're All Set!
          </motion.h2>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            We can't wait to see you, {customerInfo.firstName}!
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
                {bookingNumber || 'PENDING'}
              </Badge>
              <CardTitle className="text-lg font-display">Appointment Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-semibold text-lg">{service?.name}</p>
                    <Badge variant="outline" className="mt-1">{service?.categoryName}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">${service?.price}</p>
                    {merchantInfo?.requireDeposit && merchantInfo.depositPercentage > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Deposit paid: ${Math.round(service.price * (merchantInfo.depositPercentage / 100) * 100) / 100}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {selectedDate && merchantInfo ? 
                      TimezoneUtils.formatInTimezone(selectedDate, merchantInfo.timezone, 'EEEE, MMMM d, yyyy') :
                      selectedDate?.toLocaleDateString("en-US", { 
                        weekday: "long", 
                        month: "long", 
                        day: "numeric" 
                      })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    at <TimeDisplay 
                      date={`${format(selectedDate!, 'yyyy-MM-dd')}T${selectedTime}:00`} 
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
                  <p className="font-medium">{selectedStaffMember?.name || 'Any Available Specialist'}</p>
                  <p className="text-sm text-muted-foreground">{service?.duration} minute session</p>
                </div>
              </div>
              
              {/* Divider */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">What's Next?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <p>Confirmation email sent to {customerInfo.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <p>We'll send a reminder 24 hours before</p>
                  </div>
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
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(businessAddress)}`, '_blank')}
            >
              <MapPin className="h-4 w-4" />
              Get Directions
            </Button>
            <Button
              variant="outline"
              className="gap-2"
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
              setSelectedService(null);
              setSelectedStaff(null);
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
              setIsReturningCustomer(false);
            }}
          >
            Book Another Appointment
          </Button>
        </motion.div>
        
        {/* Contact Info */}
        <motion.div 
          className="mt-8 text-center space-y-2 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="font-medium">Need to make changes?</p>
          <div className="flex items-center justify-center gap-4">
            <a href={`tel:${businessPhone}`} className="flex items-center gap-1 hover:text-primary">
              <Phone className="h-4 w-4" />
              {businessPhone}
            </a>
            <a href={`mailto:${businessEmail}`} className="flex items-center gap-1 hover:text-primary">
              <Mail className="h-4 w-4" />
              {businessEmail}
            </a>
          </div>
          <p className="text-xs">{businessAddress}</p>
        </motion.div>
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
              {merchantInfo?.name || 'Serenity Spa'}
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
                  {currentStep === 5 && "Complete Your Booking"}
                  {currentStep === 6 && "Secure Payment"}
                  {currentStep === 7 && `Welcome to ${merchantInfo?.name || 'Serenity'}`}
                </CardTitle>
                <CardDescription className="text-lg text-foreground/60 max-w-2xl mx-auto">
                  {currentStep === 1 && "Indulge in our curated collection of rejuvenating treatments"}
                  {currentStep === 2 && "Our expert therapists are here to provide you with an exceptional experience"}
                  {currentStep === 3 && "Find the perfect time for your moment of relaxation"}
                  {currentStep === 4 && "Are you a returning customer? Let's check"}
                  {currentStep === 5 && "Just a few details to secure your appointment"}
                  {currentStep === 6 && "Pay deposit to secure your booking"}
                  {currentStep === 7 && "Your journey to wellness begins here"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentStep === 5 ? (
                  // No animation wrapper for the form to prevent focus loss
                  <CustomerFormComponent 
                    customerInfo={customerInfo} 
                    onCustomerInfoChange={setCustomerInfo}
                    isReturningCustomer={isReturningCustomer}
                  />
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
                      {currentStep === 2 && <StaffSelection />}
                      {currentStep === 3 && <DateTimeSelection />}
                      {currentStep === 4 && (
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
                            setCurrentStep(5);
                          }}
                          onNewCustomer={() => {
                            setIsReturningCustomer(false);
                            setCurrentStep(5);
                          }}
                        />
                      )}
                      {currentStep === 6 && service && (
                        <PaymentStep
                          amount={Math.round(service.price * (merchantInfo?.depositPercentage || 0) / 100 * 100) / 100}
                          currency={merchantInfo?.currency || 'AUD'}
                          onPaymentSuccess={handleBookingSubmit}
                          onCancel={() => setCurrentStep(5)}
                          service={service}
                          date={selectedDate!}
                          time={selectedTime!}
                          staffName={selectedStaffMember?.name || 'Any Available'}
                          customerName={`${customerInfo.firstName} ${customerInfo.lastName}`}
                        />
                      )}
                      {currentStep === 7 && <Confirmation />}
                    </motion.div>
                  </AnimatePresence>
                )}

                  {currentStep < 7 && currentStep !== 6 && (
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
                              {currentStep === 5 ? "Complete Booking" : "Continue"}
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
    </main>
  );
}