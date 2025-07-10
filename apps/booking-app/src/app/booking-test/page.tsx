'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { CheckCircle2, XCircle, Loader2, Calendar, Play, RotateCcw, Radio, Zap } from 'lucide-react';
import { Checkbox } from '@heya-pos/ui';
import { format } from 'date-fns';
import axios from 'axios';

interface TestResult {
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

// Standalone test page for granular booking flow testing
export default function BookingTestPage() {
  const [merchantSubdomain, setMerchantSubdomain] = useState('zen-wellness');
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  
  // Test data states
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerData, setCustomerData] = useState({
    name: 'Lukas Nguyen',
    email: 'lukas.tn90@gmail.com',
    phone: '+61422627624',
    notes: 'Test booking via granular test page'
  });
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  
  // Test results
  const [results, setResults] = useState<Record<string, TestResult>>({
    merchantInfo: { status: 'pending' },
    services: { status: 'pending' },
    staff: { status: 'pending' },
    availability: { status: 'pending' },
    booking: { status: 'pending' }
  });
  
  // Loading states
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';


  // Helper to create axios instance with subdomain
  const createApiClient = (subdomain: string) => {
    return {
      get: (url: string, config = {}) => 
        axios.get(`${API_URL}${url}`, {
          ...config,
          params: { subdomain, ...(config.params || {}) },
          headers: {
            'X-Merchant-Subdomain': subdomain,
            ...(config.headers || {})
          }
        }),
      post: (url: string, data: any, config = {}) => 
        axios.post(`${API_URL}${url}`, data, {
          ...config,
          params: { subdomain, ...(config.params || {}) },
          headers: {
            'X-Merchant-Subdomain': subdomain,
            ...(config.headers || {})
          }
        })
    };
  };

  const updateResult = (key: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [key]: result }));
  };

  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  // Test Functions
  const getMerchantInfo = async () => {
    setLoadingState('merchantInfo', true);
    const api = createApiClient(merchantSubdomain);
    
    try {
      const response = await api.get('/v1/public/merchant-info');
      setMerchantInfo(response.data);
      updateResult('merchantInfo', {
        status: 'success',
        message: `Loaded merchant: ${response.data.name}`,
        data: response.data
      });
    } catch (error: any) {
      updateResult('merchantInfo', {
        status: 'error',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setLoadingState('merchantInfo', false);
    }
  };

  const getServices = async () => {
    setLoadingState('services', true);
    const api = createApiClient(merchantSubdomain);
    
    try {
      const response = await api.get('/v1/public/services');
      const serviceList = response.data.data || [];
      setServices(serviceList);
      updateResult('services', {
        status: 'success',
        message: `Found ${serviceList.length} services`,
        data: serviceList
      });
    } catch (error: any) {
      updateResult('services', {
        status: 'error',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setLoadingState('services', false);
    }
  };

  const getStaff = async () => {
    setLoadingState('staff', true);
    const api = createApiClient(merchantSubdomain);
    
    try {
      const response = await api.get('/v1/public/staff');
      const staffList = response.data.data || [];
      setStaff(staffList);
      updateResult('staff', {
        status: 'success',
        message: `Found ${staffList.length} staff members`,
        data: staffList
      });
    } catch (error: any) {
      updateResult('staff', {
        status: 'error',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setLoadingState('staff', false);
    }
  };

  const checkAvailability = async () => {
    if (selectedServices.length === 0) {
      updateResult('availability', {
        status: 'error',
        message: 'Please select at least one service'
      });
      return;
    }

    setLoadingState('availability', true);
    const api = createApiClient(merchantSubdomain);
    
    try {
      const payload = {
        date: selectedDate,
        services: selectedServices.map(serviceId => ({
          serviceId,
          staffId: selectedStaff === 'any' ? undefined : selectedStaff || undefined
        }))
      };

      
      const response = await api.post('/v1/public/bookings/check-availability', payload);
      const slots = response.data.slots || [];
      const availableSlotsList = slots.filter((s: any) => s.available);
      setAvailableSlots(availableSlotsList);
      
      updateResult('availability', {
        status: 'success',
        message: `Found ${availableSlotsList.length} available time slots`,
        data: slots
      });
    } catch (error: any) {
      updateResult('availability', {
        status: 'error',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setLoadingState('availability', false);
    }
  };

  const createBooking = async () => {
    if (selectedServices.length === 0 || !selectedTime) {
      updateResult('booking', {
        status: 'error',
        message: 'Please select at least one service and a time slot'
      });
      return;
    }

    setLoadingState('booking', true);
    const api = createApiClient(merchantSubdomain);
    
    try {
      // Determine staff assignment based on merchant settings
      let finalStaffId = selectedStaff === 'any' ? null : selectedStaff || undefined;
      
      // If merchant doesn't allow unassigned bookings and no staff is selected, auto-assign
      if (!finalStaffId && merchantInfo && !merchantInfo.allowUnassignedBookings) {
        // Need to find an available staff member
        if (staff.length > 0) {
          
          // Try each staff member to find one that's available
          let assignedStaff = null;
          for (const staffMember of staff) {
            try {
              // Check if this staff member is available
              const availCheckPayload = {
                date: selectedDate,
                services: selectedServices.map(serviceId => ({
                  serviceId,
                  staffId: staffMember.id
                }))
              };
              
              const availRes = await api.post('/v1/public/bookings/check-availability', availCheckPayload);
              const slots = availRes.data.slots || [];
              const targetSlot = slots.find((s: any) => s.time === selectedTime);
              
              if (targetSlot && targetSlot.available) {
                assignedStaff = staffMember;
                finalStaffId = staffMember.id;
                break;
              }
            } catch (err) {
              // Skip this staff member if check fails
            }
          }
          
          if (!assignedStaff) {
            updateResult('booking', {
              status: 'error',
              message: 'No staff members available at this time. Please select a different time.'
            });
            return;
          }
        } else {
          updateResult('booking', {
            status: 'error',
            message: 'No staff members available for auto-assignment'
          });
          return;
        }
      }
      
      // Generate unique customer data to avoid conflicts
      const timestamp = Date.now();
      const bookingData = {
        customerName: `${customerData.name} ${timestamp}`,
        customerEmail: customerData.email.replace('@', `+${timestamp}@`),
        customerPhone: customerData.phone,
        services: selectedServices.map(serviceId => ({ serviceId })),
        staffId: finalStaffId,  // staffId goes at top level, not in services
        date: selectedDate,
        startTime: selectedTime,
        notes: customerData.notes
      };

      
      // Set broadcast status to sending
      setBroadcastStatus('sending');
      
      const response = await api.post('/v1/public/bookings', bookingData);
      setCreatedBooking(response.data);
      
      // Mark broadcast as sent after successful booking creation
      if ('BroadcastChannel' in window) {
        setBroadcastStatus('sent');
        setTimeout(() => setBroadcastStatus('idle'), 3000);
      } else {
        setBroadcastStatus('error');
        setTimeout(() => setBroadcastStatus('idle'), 3000);
      }
      
      updateResult('booking', {
        status: 'success',
        message: `Booking created successfully! ID: ${response.data.id}`,
        data: response.data
      });
    } catch (error: any) {
      
      // Reset broadcast status on error
      setBroadcastStatus('idle');
      
      updateResult('booking', {
        status: 'error',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setLoadingState('booking', false);
    }
  };

  const resetAll = () => {
    setServices([]);
    setSelectedServices([]);
    setStaff([]);
    setSelectedStaff('');
    setAvailableSlots([]);
    setSelectedTime('');
    setCreatedBooking(null);
    setMerchantInfo(null);
    setResults({
      merchantInfo: { status: 'pending' },
      services: { status: 'pending' },
      staff: { status: 'pending' },
      availability: { status: 'pending' },
      booking: { status: 'pending' }
    });
  };

  const createRandomBooking = async () => {
    try {
      // Step 1: Get merchant info
      await getMerchantInfo();
      
      // Step 2: Get services and select random 1-3
      await getServices();
      
      // Wait for services to be loaded
      setTimeout(async () => {
        if (services.length === 0) {
          updateResult('booking', {
            status: 'error',
            message: 'No services available'
          });
          return;
        }
        
        // Select random 1-3 services
        const numServices = Math.floor(Math.random() * 3) + 1;
        const shuffled = [...services].sort(() => 0.5 - Math.random());
        const randomServices = shuffled.slice(0, Math.min(numServices, services.length));
        setSelectedServices(randomServices.map(s => s.id));
        
        // Step 3: Get staff
        await getStaff();
        
        setTimeout(async () => {
          // Select random staff or unassigned
          if (staff.length > 0 && Math.random() > 0.3) { // 70% chance to select staff
            const randomStaff = staff[Math.floor(Math.random() * staff.length)];
            setSelectedStaff(randomStaff.id);
          } else {
            setSelectedStaff('any');
          }
          
          // Set date to ~48 hours from now
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 2);
          const dateStr = format(futureDate, 'yyyy-MM-dd');
          setSelectedDate(dateStr);
          
          // Step 4: Check availability
          await checkAvailability();
          
          setTimeout(async () => {
            if (availableSlots.length === 0) {
              updateResult('booking', {
                status: 'error',
                message: 'No available slots found'
              });
              return;
            }
            
            // Find available slots during business hours (9am-5pm)
            const businessSlots = availableSlots.filter(slot => {
              if (!slot.available) return false;
              const hour = parseInt(slot.time.split(':')[0]);
              return hour >= 9 && hour <= 17;
            });
            
            if (businessSlots.length === 0) {
              updateResult('booking', {
                status: 'error',
                message: 'No available slots during business hours'
              });
              return;
            }
            
            // Select a random available slot
            const randomSlot = businessSlots[Math.floor(Math.random() * businessSlots.length)];
            setSelectedTime(randomSlot.time);
            
            // Step 5: Create the booking
            await createBooking();
          }, 1000);
        }, 1000);
      }, 1000);
      
    } catch (error: any) {
      updateResult('booking', {
        status: 'error',
        message: 'Failed to create random booking: ' + error.message
      });
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default' as const,
      error: 'destructive' as const,
      pending: 'outline' as const
    };
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Granular Booking Test
          </CardTitle>
          <CardDescription>
            Test each step of the booking flow individually with full control over inputs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Merchant Subdomain</Label>
                <div className="flex gap-2 mb-2">
                  <Button 
                    onClick={() => setMerchantSubdomain('hamilton')} 
                    variant={merchantSubdomain === 'hamilton' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Hamilton
                  </Button>
                  <Button 
                    onClick={() => setMerchantSubdomain('zen-wellness')} 
                    variant={merchantSubdomain === 'zen-wellness' ? 'default' : 'outline'}
                    size="sm"
                  >
                    Zen Wellness
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={merchantSubdomain}
                    onChange={(e) => setMerchantSubdomain(e.target.value)}
                    placeholder="custom-subdomain"
                    className="flex-1"
                  />
                  <Button onClick={resetAll} variant="outline" size="icon">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Customer Information</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="customer-name">Name</Label>
                    <Input
                      id="customer-name"
                      value={customerData.name}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-email">Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone">Phone</Label>
                    <Input
                      id="customer-phone"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+61400000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-notes">Notes</Label>
                    <Textarea
                      id="customer-notes"
                      value={customerData.notes}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Booking notes"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={createRandomBooking}
                variant="default"
                className="w-full"
                disabled={loading.booking}
              >
                {loading.booking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Random Booking...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Create Random Test Booking
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Automatically selects 1-3 random services, random staff, and finds an available slot ~48 hours from now
              </p>
            </CardContent>
          </Card>

          {/* Test Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Step 1: Merchant Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(results.merchantInfo.status)}
                    Get Merchant Info
                  </CardTitle>
                  {getStatusBadge(results.merchantInfo.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={getMerchantInfo} 
                  disabled={loading.merchantInfo}
                  className="w-full"
                >
                  {loading.merchantInfo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Fetch Merchant Info
                </Button>
                {results.merchantInfo.message && (
                  <p className="text-sm text-muted-foreground">{results.merchantInfo.message}</p>
                )}
                {merchantInfo && (
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {merchantInfo.name}</p>
                    <p><strong>Timezone:</strong> {merchantInfo.timezone}</p>
                    <p><strong>Allow Unassigned:</strong> {merchantInfo.allowUnassignedBookings ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Get Services */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(results.services.status)}
                    Get Services
                  </CardTitle>
                  {getStatusBadge(results.services.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={getServices} 
                  disabled={loading.services}
                  className="w-full"
                >
                  {loading.services && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Fetch Services
                </Button>
                {results.services.message && (
                  <p className="text-sm text-muted-foreground">{results.services.message}</p>
                )}
                {services.length > 0 && (
                  <div>
                    <Label>Select Services (Multiple allowed)</Label>
                    <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                      {services.map((service) => (
                        <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <Checkbox
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedServices([...selectedServices, service.id]);
                              } else {
                                setSelectedServices(selectedServices.filter(id => id !== service.id));
                              }
                            }}
                          />
                          <span className="text-sm flex-1">
                            {service.name} - ${service.price} ({service.duration}min)
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedServices.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Get Staff */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(results.staff.status)}
                    Get Staff
                  </CardTitle>
                  {getStatusBadge(results.staff.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={getStaff} 
                  disabled={loading.staff}
                  className="w-full"
                >
                  {loading.staff && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Fetch Staff
                </Button>
                {results.staff.message && (
                  <p className="text-sm text-muted-foreground">{results.staff.message}</p>
                )}
                {staff.length > 0 && (
                  <div>
                    <Label>Select Staff</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">🌟 Any Available</SelectItem>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} - {member.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStaff === 'any' && merchantInfo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {merchantInfo.allowUnassignedBookings 
                          ? "Will create unassigned booking" 
                          : "Will auto-assign next available staff"}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 4: Check Availability */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(results.availability.status)}
                    Check Availability
                  </CardTitle>
                  {getStatusBadge(results.availability.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={checkAvailability} 
                  disabled={loading.availability || selectedServices.length === 0}
                  className="w-full"
                >
                  {loading.availability && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Check Available Times
                </Button>
                {results.availability.message && (
                  <p className="text-sm text-muted-foreground">{results.availability.message}</p>
                )}
                {availableSlots.length > 0 && (
                  <div>
                    <Label>Select Time</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot.time} value={slot.time}>
                            {slot.time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 5: Create Booking */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(results.booking.status)}
                    Create Booking
                  </CardTitle>
                  {getStatusBadge(results.booking.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name</Label>
                    <Input
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Customer Email</Label>
                    <Input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Customer Phone</Label>
                    <Input
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={customerData.notes}
                      onChange={(e) => setCustomerData({...customerData, notes: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Show selected services summary */}
                {selectedServices.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Selected Services:</h4>
                    <div className="space-y-1">
                      {selectedServices.map(serviceId => {
                        const service = services.find(s => s.id === serviceId);
                        if (!service) return null;
                        return (
                          <div key={serviceId} className="text-xs flex justify-between">
                            <span>{service.name}</span>
                            <span>${service.price} - {service.duration}min</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t text-sm font-medium flex justify-between">
                      <span>Total:</span>
                      <span>
                        ${selectedServices.reduce((sum, id) => {
                          const service = services.find(s => s.id === id);
                          return sum + (service?.price || 0);
                        }, 0).toFixed(2)} - {selectedServices.reduce((sum, id) => {
                          const service = services.find(s => s.id === id);
                          return sum + (service?.duration || 0);
                        }, 0)}min
                      </span>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={createBooking} 
                  disabled={loading.booking || selectedServices.length === 0 || !selectedTime}
                  className="w-full"
                >
                  {loading.booking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Booking
                </Button>
                
                {results.booking.message && (
                  <p className="text-sm text-muted-foreground">{results.booking.message}</p>
                )}
                
                {createdBooking && (
                  <>
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-800">Booking Created!</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <dt className="font-medium">Booking ID:</dt>
                            <dd className="font-mono text-xs">{createdBooking.id}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Provider:</dt>
                            <dd>{createdBooking.staffName || 'Unassigned'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Date & Time:</dt>
                            <dd>{createdBooking.date} at {createdBooking.startTime}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Services:</dt>
                            <dd>
                              {createdBooking.services && createdBooking.services.length > 0 ? (
                                <div className="space-y-1">
                                  {createdBooking.services.map((s: any, i: number) => (
                                    <div key={i} className="text-xs">
                                      {s.name} - ${s.price} ({s.duration}min)
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                createdBooking.serviceName || 'N/A'
                              )}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                    
                    {/* Calendar Auto-Update Notice */}
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-800 text-base">✨ Calendar Auto-Update</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-green-800">
                          <strong>The booking has been created with staff:</strong> {createdBooking.staffName || 'Unassigned'}
                        </p>
                        <p className="text-sm text-green-700 mt-2">
                          The calendar will automatically update to show this booking in the 
                          <strong> {createdBooking.staffId ? createdBooking.staffName : 'Unassigned'} column</strong> using:
                        </p>
                        <ul className="text-sm text-green-600 mt-2 list-disc list-inside">
                          <li>Broadcast events for instant cross-tab updates</li>
                          <li>Focus-based refresh when switching back to calendar tab</li>
                        </ul>
                        <p className="text-sm text-green-600 mt-2">
                          💡 No manual refresh needed - the calendar stays in sync automatically!
                        </p>
                        
                        {/* Broadcast Status Indicator */}
                        {broadcastStatus !== 'idle' && (
                          <div className="mt-3 flex items-center gap-2">
                            {broadcastStatus === 'sent' ? (
                              <>
                                <Radio className="w-4 h-4 text-green-600 animate-pulse" />
                                <span className="text-sm text-green-700 font-medium">
                                  Broadcast event sent successfully!
                                </span>
                              </>
                            ) : broadcastStatus === 'error' ? (
                              <>
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-700">
                                  Broadcast failed
                                </span>
                              </>
                            ) : (
                              <>
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                <span className="text-sm text-blue-700">
                                  Broadcasting...
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Debug Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm font-medium">View All Test Results</summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}