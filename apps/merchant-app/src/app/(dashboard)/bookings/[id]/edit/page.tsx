'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { type Booking, type Service, type Staff } from '@heya-pos/shared';
import { apiClient } from '@/lib/api-client';
import { toMerchantTime } from '@/lib/date-utils';
import { fromZonedTime } from 'date-fns-tz';

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    serviceId: '',
    staffId: '',
    date: '',
    startTime: '',
    notes: ''
  });

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
      
      console.log('=== LOADED BOOKING DATA ===');
      console.log('Raw booking data:', bookingData);
      console.log('StartTime:', bookingData.startTime);
      console.log('Date:', bookingData.date);
      console.log('ServiceId:', bookingData.serviceId);
      console.log('StaffId:', bookingData.staffId);
      
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
      
      setFormData({
        serviceId: bookingData.serviceId,
        staffId: bookingData.staffId,
        date: bookingDate.toISOString().split('T')[0],
        startTime: timeString,
        notes: bookingData.notes || ''
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('\n\n=== EDIT BOOKING FORM SUBMITTED ===');
    console.log('Form event type:', e.type);
    console.log('Saving state before:', saving);
    
    // Log EXACTLY what's in the form inputs right now
    const dateInput = (document.getElementById('date') as HTMLInputElement)?.value;
    const timeInput = (document.getElementById('time') as HTMLInputElement)?.value;
    console.log('\n🔍 ACTUAL INPUT VALUES:');
    console.log('Date input value:', dateInput);
    console.log('Time input value:', timeInput);
    console.log('\n📋 FORM STATE:');
    console.log('formData.date:', formData.date);
    console.log('formData.startTime:', formData.startTime);
    console.log('\n📅 ORIGINAL BOOKING:');
    console.log('booking.startTime:', booking?.startTime);
    
    // Prevent double submission
    if (saving) {
      console.log('Already saving, ignoring duplicate submission');
      return;
    }
    
    try {
      setSaving(true);
      console.log('\nSetting saving to true');
      console.log('Full form data:', JSON.stringify(formData, null, 2));
      console.log('Full booking data:', JSON.stringify(booking, null, 2));
      
      const selectedService = services.find(s => s.id === formData.serviceId);
      const selectedStaff = staff.find(s => s.id === formData.staffId);
      
      console.log('Selected service:', selectedService);
      console.log('Selected staff:', selectedStaff);
      
      if (!selectedService || !selectedStaff) {
        throw new Error('Invalid service or staff selection');
      }
      
      // Construct the full startTime ISO string by combining date and time
      const startTime = `${formData.date}T${formData.startTime}:00`;
      
      // Debug logging
      console.log('Edit booking debug:', {
        originalStartTime: booking.startTime,
        newStartTime: startTime,
        formData,
        booking
      });
      
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
        const newDateUTC = fromZonedTime(newDateInMerchantTZ, 'Australia/Sydney');
        
        // Parse the original time (already in UTC)
        const originalDate = new Date(booking.startTime);
        
        // Compare the actual time values
        timeChanged = newDateUTC.getTime() !== originalDate.getTime();
        
        console.log('\n⏰ TIME COMPARISON DETAILS:');
        console.log('Form inputs:', { date: formData.date, time: formData.startTime });
        console.log('Parsed values:', { year, month, day, hours, minutes });
        console.log('New date in merchant TZ:', newDateInMerchantTZ.toString());
        console.log('New date in UTC:', newDateUTC.toISOString());
        console.log('Original date:', originalDate.toISOString());
        console.log('Time changed?', timeChanged);
        console.log('Timestamps:', {
          original: originalDate.getTime(),
          new: newDateUTC.getTime(),
          difference: newDateUTC.getTime() - originalDate.getTime()
        });
      }
      
      const staffChanged = formData.staffId !== booking.staffId;
      
      if (timeChanged || staffChanged) {
        // Use rescheduleBooking for time/staff changes
        // The API expects an ISO string in UTC
        const [year, month, day] = formData.date.split('-').map(Number);
        const [hours, minutes] = formData.startTime.split(':').map(Number);
        const dateInMerchantTZ = new Date(year, month - 1, day, hours, minutes, 0);
        
        // Convert merchant time to UTC
        const dateUTC = fromZonedTime(dateInMerchantTZ, 'Australia/Sydney');
        const startTimeISO = dateUTC.toISOString();
        
        console.log('Calling rescheduleBooking with:', {
          bookingId: params.id,
          startTime: startTimeISO,
          staffId: formData.staffId,
          dateInMerchantTZ: dateInMerchantTZ.toString(),
          dateUTC: dateUTC.toString()
        });
        
        console.log('About to call rescheduleBooking...');
        const rescheduleResponse = await apiClient.rescheduleBooking(params.id as string, {
          startTime: startTimeISO,
          staffId: formData.staffId
        });
        console.log('Reschedule response:', rescheduleResponse);
      } else {
        console.log('NO CHANGES DETECTED for time/staff - not calling rescheduleBooking');
        console.log('timeChanged:', timeChanged);
        console.log('staffChanged:', staffChanged);
      }
      
      // Update notes if changed (this is supported by updateBooking)
      const notesChanged = formData.notes !== (booking.notes || '');
      console.log('Notes changed?', notesChanged, 'Old:', booking.notes, 'New:', formData.notes);
      
      if (notesChanged) {
        console.log('Updating notes...');
        const notesResponse = await apiClient.updateBooking(params.id as string, {
          notes: formData.notes
        });
        console.log('Notes update response:', notesResponse);
      }
      
      // Note: Service changes are not supported by the current API
      // If service was changed, we should show a warning
      if (formData.serviceId !== booking.serviceId) {
        console.warn('Service changes are not supported by the current API');
        console.log('Service ID changed from', booking.serviceId, 'to', formData.serviceId);
      }
      
      // Check if any changes were made
      if (!timeChanged && !staffChanged && !notesChanged) {
        console.log('No changes detected in booking');
        alert('No changes were made to the booking.');
      }
      
      console.log('About to redirect to:', `/bookings/${params.id}`);
      router.push(`/bookings/${params.id}`);
    } catch (error) {
      console.error('=== ERROR IN HANDLESUBMIT ===');
      console.error('Error details:', error);
      console.error('Error stack:', (error as Error).stack);
      console.error('Error response:', (error as any)?.response?.data);
      alert('Failed to update booking: ' + (error as Error).message);
      setSaving(false);
      // Don't redirect on error
    } finally {
      console.log('=== END OF HANDLESUBMIT ===');
      console.log('Saving state after:', saving);
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

              <div className="space-y-2">
                <Label htmlFor="service">Service</Label>
                <Select
                  value={formData.serviceId}
                  disabled
                >
                  <SelectTrigger className="bg-gray-50">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration} min - ${service.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Service changes are not supported at this time</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff">Staff Member</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData({...formData, staffId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => 
                      (s.services && s.services.includes(formData.serviceId)) || !formData.serviceId
                    ).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      console.log('\n🕒 TIME INPUT CHANGED!');
                      console.log('Old value:', formData.startTime);
                      console.log('New value:', e.target.value);
                      setFormData({...formData, startTime: e.target.value});
                    }}
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
                onClick={(e) => {
                  console.log('\n\n🔴 SAVE BUTTON CLICKED! 🔴');
                  console.log('Button event type:', e.type);
                  console.log('Saving state at click:', saving);
                  console.log('Button disabled:', saving);
                  console.log('\n📝 Form data at click time:');
                  console.log(JSON.stringify(formData, null, 2));
                  
                  // Get input values at click time
                  const dateVal = (document.getElementById('date') as HTMLInputElement)?.value;
                  const timeVal = (document.getElementById('time') as HTMLInputElement)?.value;
                  console.log('\n🎯 Input values at click time:');
                  console.log('Date input:', dateVal);
                  console.log('Time input:', timeVal);
                  // Let the form handle submission
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}