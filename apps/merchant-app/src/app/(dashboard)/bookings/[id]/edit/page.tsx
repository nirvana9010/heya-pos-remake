'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { ArrowLeft, Calendar, Clock, Plus, X } from 'lucide-react';
import { type Booking, type Service, type Staff } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';
import { toMerchantTime } from '@/lib/date-utils';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ServiceSelectionSlideout } from '@/components/ServiceSelectionSlideout';

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    services: [] as Array<{
      id: string;
      serviceId: string;
      name: string;
      staffId: string;
      price: number;
      duration: number;
      categoryName?: string;
    }>,
    date: '',
    startTime: '',
    notes: ''
  });
  const [isServiceSlideoutOpen, setIsServiceSlideoutOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingData, servicesResponse, staffData] = await Promise.all([
        apiClient.getBooking(params.id as string),
        apiClient.getServices(),
        apiClient.getStaff()
      ]);
      
      // Extract services array from paginated response
      const servicesData = servicesResponse.data || [];
      
      
      setBooking(bookingData);
      setServices(servicesData);
      setStaff(staffData);
      
      // Initialize form with booking data
      // The date field is actually startTime from the API
      const dateSource = bookingData.date || bookingData.startTime;
      const bookingDate = toMerchantTime(dateSource);
      
      // Extract time from startTime in merchant timezone
      let timeString = bookingData.startTime;
      if (typeof bookingData.startTime === 'string' && bookingData.startTime.includes('T')) {
        // If startTime is an ISO string, convert to merchant timezone and extract the time part
        const startTimeDate = toMerchantTime(bookingData.startTime);
        timeString = `${startTimeDate.getHours().toString().padStart(2, '0')}:${startTimeDate.getMinutes().toString().padStart(2, '0')}`;
      }
      
      // Initialize services array
      let initialServices = [];
      
      if (bookingData.services && bookingData.services.length > 0) {
        // New format with services array
        initialServices = bookingData.services.map((service: any) => ({
          id: service.id || Math.random().toString(36).substr(2, 9),
          serviceId: service.serviceId || service.id,
          name: service.name,
          staffId: service.staffId || bookingData.staffId,
          price: Number(service.price || 0),
          duration: service.duration,
          categoryName: service.categoryName
        }));
      } else if (bookingData.serviceId) {
        // Old format with single service
        const service = servicesData.find((s: Service) => s.id === bookingData.serviceId);
        if (service) {
          initialServices = [{
            id: Math.random().toString(36).substr(2, 9),
            serviceId: bookingData.serviceId,
            name: bookingData.serviceName || service.name,
            staffId: bookingData.staffId,
            price: Number(bookingData.price || service.price || 0),
            duration: bookingData.duration || service.duration,
            categoryName: service.categoryName
          }];
        }
      }
      
      
      // If no services were initialized but we have basic booking info, create one from that
      if (initialServices.length === 0 && bookingData.serviceName) {
        initialServices = [{
          id: Math.random().toString(36).substr(2, 9),
          serviceId: bookingData.serviceId || '',
          name: bookingData.serviceName,
          staffId: bookingData.staffId || '',
          price: Number(bookingData.price || bookingData.totalAmount || 0),
          duration: bookingData.duration || 60,
          categoryName: ''
        }];
      }
      
      setFormData({
        services: initialServices,
        date: bookingDate.toISOString().split('T')[0],
        startTime: timeString,
        notes: bookingData.notes || ''
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (saving) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Validate services
      if (formData.services.length === 0) {
        throw new Error('At least one service must be selected');
      }
      
      // Validate all services have staff assigned
      const servicesWithoutStaff = formData.services.filter(s => !s.staffId);
      if (servicesWithoutStaff.length > 0) {
        throw new Error('Please assign staff to all services');
      }
      
      // Construct the full startTime ISO string by combining date and time
      const startTime = `${formData.date}T${formData.startTime}:00`;
      
      
      // Normalize times for comparison
      // The API returns startTime with timezone (e.g., "2025-07-02T10:00:00.000Z")
      // We need to properly handle timezone conversion
      let timeChanged = false;
      
      if (booking.startTime) {
        // Create a date object in merchant timezone from our form data
        const [year, month, day] = formData.date.split('-').map(Number);
        const [hours, minutes] = formData.startTime.split(':').map(Number);
        const newDateInMerchantTZ = new Date(year, month - 1, day, hours, minutes, 0);
        
        // Convert to UTC for comparison
        const newDateUTC = zonedTimeToUtc(newDateInMerchantTZ, 'Australia/Sydney');
        
        // Parse the original time (already in UTC)
        const originalDate = new Date(booking.startTime);
        
        // Compare the actual time values
        timeChanged = newDateUTC.getTime() !== originalDate.getTime();
        
      }
      
      // Check if services have changed
      const servicesChanged = JSON.stringify(formData.services.map(s => ({
        serviceId: s.serviceId,
        staffId: s.staffId,
        price: s.price
      }))) !== JSON.stringify((booking.services || []).map((s: any) => ({
        serviceId: s.serviceId || s.id,
        staffId: s.staffId || booking.staffId,
        price: s.price
      })));
      
      // For backward compatibility, check if the main staff changed
      const mainStaffId = formData.services[0]?.staffId;
      const staffChanged = mainStaffId !== booking.staffId;
      
      if (timeChanged || staffChanged || servicesChanged) {
        // Use updateBooking for any changes including services
        const [year, month, day] = formData.date.split('-').map(Number);
        const [hours, minutes] = formData.startTime.split(':').map(Number);
        const dateInMerchantTZ = new Date(year, month - 1, day, hours, minutes, 0);
        
        // Convert merchant time to UTC
        const dateUTC = zonedTimeToUtc(dateInMerchantTZ, 'Australia/Sydney');
        const startTimeISO = dateUTC.toISOString();
        
        const updateData: any = {
          startTime: startTimeISO,
          services: formData.services.map(s => ({
            serviceId: s.serviceId,
            staffId: s.staffId,
            price: s.price,
            duration: s.duration
          }))
        };
        
        await apiClient.updateBooking(params.id as string, updateData);
      } else {
      }
      
      // Update notes if changed (this is supported by updateBooking)
      const notesChanged = formData.notes !== (booking.notes || '');
      
      if (notesChanged) {
        await apiClient.updateBooking(params.id as string, {
          notes: formData.notes
        });
      }
      
      // Services are now handled above with updateBooking
      
      // Check if any changes were made
      if (!timeChanged && !staffChanged && !notesChanged) {
      }
      
      router.push(`/bookings/${params.id}`);
    } catch (error) {
      alert('Failed to update booking: ' + (error as Error).message);
      setSaving(false);
      // Don't redirect on error
    } finally {
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Booking not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/bookings/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Booking</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input 
                  value={booking.customerName} 
                  disabled 
                  className="bg-gray-50"
                />
              </div>

              {/* Services section spans both columns */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Services</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsServiceSlideoutOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>
                
                {formData.services.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">No services selected</p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsServiceSlideoutOpen(true)}
                      className="mt-2"
                    >
                      Add a service
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.services.map((service, index) => (
                      <div key={service.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-medium">{service.name}</h4>
                              {service.categoryName && (
                                <p className="text-sm text-gray-500">{service.categoryName}</p>
                              )}
                              <p className="text-sm text-gray-600">
                                {service.duration} min - ${service.price.toFixed(2)}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Label htmlFor={`staff-${service.id}`} className="text-sm">Staff:</Label>
                              <Select
                                value={service.staffId}
                                onValueChange={(value) => {
                                  const updatedServices = [...formData.services];
                                  updatedServices[index].staffId = value;
                                  setFormData({...formData, services: updatedServices});
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select staff" />
                                </SelectTrigger>
                                <SelectContent>
                                  {staff.filter(s => 
                                    !s.services || s.services.length === 0 || s.services.includes(service.serviceId)
                                  ).map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {member.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updatedServices = formData.services.filter((_, i) => i !== index);
                              setFormData({...formData, services: updatedServices});
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total Duration:</span>
                        <span className="font-medium">
                          {formData.services.reduce((sum, s) => sum + s.duration, 0)} minutes
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Total Price:</span>
                        <span className="font-medium">
                          ${formData.services.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => {
                      setFormData({...formData, startTime: e.target.value});
                    }}
                    step="300" // 5 minutes in seconds
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any special requests or notes..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/bookings/${params.id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Service Selection Modal */}
      <ServiceSelectionSlideout
        isOpen={isServiceSlideoutOpen}
        onClose={() => setIsServiceSlideoutOpen(false)}
        onSelectService={(selectedService) => {
          // Check if service is already added
          if (formData.services.some(s => s.serviceId === selectedService.id)) {
            alert('This service has already been added');
            return;
          }
          
          // Add the new service
          const newService = {
            id: Math.random().toString(36).substr(2, 9),
            serviceId: selectedService.id,
            name: selectedService.name,
            staffId: '', // User will select staff
            price: selectedService.price,
            duration: selectedService.duration,
            categoryName: selectedService.categoryName
          };
          
          setFormData({
            ...formData,
            services: [...formData.services, newService]
          });
          
          setIsServiceSlideoutOpen(false);
        }}
        selectedServiceIds={formData.services.map(s => s.serviceId)}
      />
    </div>
  );
}