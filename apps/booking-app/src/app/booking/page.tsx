"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, User, Clock, UserCircle, CheckCircle } from "lucide-react";
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
import { mockApi, type Service, type Staff, type TimeSlot } from "@heya-pos/shared";
import { format } from "date-fns";


const steps = [
  { id: 1, name: "Service", icon: CheckCircle },
  { id: 2, name: "Staff", icon: User },
  { id: 3, name: "Date & Time", icon: Calendar },
  { id: 4, name: "Your Details", icon: UserCircle },
  { id: 5, name: "Confirmation", icon: CheckCircle },
];

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(searchParams.get("service"));
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [bookingId, setBookingId] = useState<string | null>(null);

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
      const [servicesData, staffData] = await Promise.all([
        mockApi.getServices(),
        mockApi.getStaff()
      ]);
      
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
      const slots = await mockApi.getAvailableSlots(
        selectedDate,
        selectedService,
        selectedStaff || undefined
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep === 4) {
      // Submit booking
      await handleBookingSubmit();
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBookingSubmit = async () => {
    if (!service || !selectedDate || !selectedTime) return;
    
    try {
      setSubmitting(true);
      
      const [hours, minutes] = selectedTime.split(':');
      const endTime = new Date(selectedDate);
      endTime.setHours(parseInt(hours), parseInt(minutes));
      endTime.setMinutes(endTime.getMinutes() + service.duration);
      
      const booking = await mockApi.createBooking({
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        serviceId: service.id,
        serviceName: service.name,
        staffId: selectedStaff || '',
        staffName: selectedStaffMember?.name || 'Any Available',
        date: selectedDate,
        startTime: selectedTime,
        endTime: format(endTime, 'HH:mm'),
        duration: service.duration,
        price: service.price,
        notes: customerInfo.notes
      });
      
      setBookingId(booking.id);
      setCurrentStep(5);
      
      toast({
        title: "Success",
        description: "Your booking has been confirmed!",
      });
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
        return customerInfo.firstName && customerInfo.lastName && customerInfo.email && customerInfo.phone;
      default:
        return true;
    }
  };

  const ProgressIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isActive && "bg-primary text-primary-foreground border-primary",
                    isCompleted && "bg-primary text-primary-foreground border-primary",
                    !isActive && !isCompleted && "bg-background border-muted-foreground/30"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 sm:w-24 h-0.5 mx-2 transition-colors",
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const ServiceSelection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading services...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedService === service.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedService(service.id)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <Badge variant="outline" className="mt-2">{service.categoryName}</Badge>
                </div>
                <RadioGroupItem value={service.id} checked={selectedService === service.id} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{service.duration} min</span>
                <span className="text-xl font-bold">${service.price}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const StaffSelection = () => {
    const availableStaff = service 
      ? staff.filter(s => !s.services || s.services.length === 0 || s.services.includes(service.id))
      : staff;

    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedStaff === "" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedStaff("")}
        >
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold">?</span>
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Any Available</CardTitle>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll assign the best available staff
                </p>
              </div>
              <RadioGroupItem value="" checked={selectedStaff === ""} />
            </div>
          </CardHeader>
        </Card>
        {availableStaff.map((member) => (
          <Card
            key={member.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedStaff === member.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedStaff(member.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {member.role}
                  </p>
                </div>
                <RadioGroupItem value={member.id} checked={selectedStaff === member.id} />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  };

  const DateTimeSelection = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Date</h3>
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today || date.getDay() === 0;
          }}
          className="rounded-md border"
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Time</h3>
        {selectedDate ? (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => (
              <Button
                key={slot.time}
                type="button"
                variant={selectedTime === slot.time ? "default" : "outline"}
                size="sm"
                disabled={!slot.available}
                onClick={() => setSelectedTime(slot.time)}
                className="w-full"
              >
                {slot.time}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Please select a date first</p>
        )}
      </div>
    </div>
  );

  const CustomerForm = () => (
    <div className="max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={customerInfo.firstName}
            onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={customerInfo.lastName}
            onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={customerInfo.email}
          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          type="tel"
          value={customerInfo.phone}
          onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Special Requests (Optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={customerInfo.notes}
          onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
          placeholder="Any special requests or notes for your appointment..."
        />
      </div>
    </div>
  );

  const Confirmation = () => {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground">
            We&apos;ve sent a confirmation email to {customerInfo.email}
          </p>
          {bookingId && (
            <p className="text-sm text-muted-foreground mt-2">
              Booking ID: {bookingId}
            </p>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Service</p>
              <p className="font-medium">{service?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Staff</p>
              <p className="font-medium">{selectedStaffMember?.name || 'Any Available'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date & Time</p>
              <p className="font-medium">
                {selectedDate?.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })} at {selectedTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{service?.duration} minutes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="font-medium text-xl">${service?.price}</p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 space-y-2">
          <Button className="w-full" onClick={() => router.push("/")}>
            Back to Home
          </Button>
          <Button variant="outline" className="w-full" onClick={() => {
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
          }}>
            Book Another Appointment
          </Button>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Book Your Appointment</h1>
          <p className="text-muted-foreground">Follow the steps below to schedule your visit</p>
        </div>

        <ProgressIndicator />

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Select a Service"}
              {currentStep === 2 && "Choose Your Preferred Staff"}
              {currentStep === 3 && "Pick a Date and Time"}
              {currentStep === 4 && "Enter Your Details"}
              {currentStep === 5 && "Booking Complete!"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Choose from our range of professional services"}
              {currentStep === 2 && "Select a staff member or let us assign the best available"}
              {currentStep === 3 && "Select your preferred appointment date and time"}
              {currentStep === 4 && "We need a few details to confirm your booking"}
              {currentStep === 5 && "Your appointment has been successfully booked"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && <ServiceSelection />}
            {currentStep === 2 && <StaffSelection />}
            {currentStep === 3 && <DateTimeSelection />}
            {currentStep === 4 && <CustomerForm />}
            {currentStep === 5 && <Confirmation />}

            {currentStep < 5 && (
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || submitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {submitting ? "Processing..." : currentStep === 4 ? "Confirm Booking" : "Next"}
                  {!submitting && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}