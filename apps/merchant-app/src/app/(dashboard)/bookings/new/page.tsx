'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Calendar } from '@heya-pos/ui';
import { CalendarIcon, Clock, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@heya-pos/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@heya-pos/ui';
import { type Service, type Customer, type Staff, type TimeSlot } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';
import { useNotifications } from '@/contexts/notifications-context';

function NewBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { refreshNotifications } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: searchParams.get('customerId') || '',
    serviceId: '',
    staffId: '',
    date: new Date(),
    time: '',
    notes: ''
  });

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.serviceId && formData.date) {
      loadAvailableSlots();
    }
  }, [formData.serviceId, formData.date, formData.staffId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [servicesData, customersResponse, staffData] = await Promise.all([
        apiClient.getServices(),
        apiClient.getCustomers(),
        apiClient.getStaff()
      ]);
      
      // Handle paginated response for customers
      const customersData = customersResponse?.data || customersResponse || [];
      
      setServices(servicesData.filter((s: any) => s.isActive));
      setCustomers(customersData);
      setStaff(staffData.filter((s: any) => s.isActive));
      
      // If customerId is provided, select that customer
      if (formData.customerId) {
        const customer = customersData.find((c: any) => c.id === formData.customerId);
        if (customer) setSelectedCustomer(customer);
      }
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
    try {
      const slots = await apiClient.checkAvailability(
        formData.date,
        formData.serviceId,
        formData.staffId === 'any-staff' ? '' : formData.staffId
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    setSelectedService(service || null);
    setFormData({ ...formData, serviceId, time: '' });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    setFormData({ ...formData, customerId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedCustomer || !formData.time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const selectedStaff = formData.staffId === 'any-staff' ? null : staff.find(s => s.id === formData.staffId);
      const [hours, minutes] = formData.time.split(':');
      const endTime = new Date(formData.date);
      endTime.setHours(parseInt(hours), parseInt(minutes));
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration);
      
      await apiClient.createBooking({
        customerId: formData.customerId,
        customerName: selectedCustomer.name,
        customerPhone: (selectedCustomer as any).mobile || selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        staffId: formData.staffId === 'any-staff' ? '' : formData.staffId,
        staffName: selectedStaff?.name || 'Any Staff',
        date: formData.date,
        startTime: formData.time,
        endTime: format(endTime, 'HH:mm'),
        duration: selectedService.duration,
        price: selectedService.price,
        notes: formData.notes
      });

      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      
      // Refresh notifications after a delay to allow backend processing
      // Increased to 2 seconds to ensure outbox events are processed
      setTimeout(() => {
        refreshNotifications();
      }, 2000);

      router.push('/bookings');
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading booking form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Booking</h1>
        <p className="text-muted-foreground mt-1">Create a new appointment booking</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="customer">Select Customer</Label>
                <Select value={formData.customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName} - {(customer as any).mobile || customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCustomer && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  <p className="text-sm text-muted-foreground">{(selectedCustomer as any).mobile || selectedCustomer.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="service">Select Service</Label>
                <Select value={formData.serviceId} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedService && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="font-medium">{selectedService.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedService.duration} minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${selectedService.price}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="staff">Preferred Staff (Optional)</Label>
                <Select value={formData.staffId} onValueChange={(value) => setFormData({ ...formData, staffId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any available staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-staff">Any available staff</SelectItem>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date, time: '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {formData.serviceId && availableSlots.length > 0 && (
                <div className="grid gap-2">
                  <Label>Available Time Slots</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={formData.time === slot.time ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setFormData({ ...formData, time: slot.time })}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {selectedService && selectedCustomer && formData.time && (
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-medium">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time:</span>
                    <span className="font-medium">
                      {format(formData.date, 'PPP')} at {formData.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{selectedService.duration} minutes</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-bold text-lg">${selectedService.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/bookings')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedService || !selectedCustomer || !formData.time}>
              {submitting ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewBookingContent />
    </Suspense>
  );
}