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
      const [bookingData, servicesData, staffData] = await Promise.all([
        apiClient.getBooking(params.id as string),
        apiClient.getServices(),
        apiClient.getStaff()
      ]);
      
      setBooking(bookingData);
      setServices(servicesData);
      setStaff(staffData);
      
      // Initialize form with booking data
      setFormData({
        serviceId: bookingData.serviceId,
        staffId: bookingData.staffId,
        date: bookingData.date.toISOString().split('T')[0],
        startTime: bookingData.startTime,
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
    
    try {
      setSaving(true);
      
      const selectedService = services.find(s => s.id === formData.serviceId);
      const selectedStaff = staff.find(s => s.id === formData.staffId);
      
      if (!selectedService || !selectedStaff) {
        throw new Error('Invalid service or staff selection');
      }
      
      // Calculate end time based on service duration
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + selectedService.duration * 60000);
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      
      await apiClient.updateBooking(params.id as string, {
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        staffId: formData.staffId,
        staffName: selectedStaff.name,
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime,
        duration: selectedService.duration,
        price: selectedService.price,
        notes: formData.notes
      });
      
      router.push(`/bookings/${params.id}`);
    } catch (error) {
      console.error('Failed to update booking:', error);
    } finally {
      setSaving(false);
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
                  onValueChange={(value) => setFormData({...formData, serviceId: value})}
                >
                  <SelectTrigger>
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
                      s.services.includes(formData.serviceId) || !formData.serviceId
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
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
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
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}