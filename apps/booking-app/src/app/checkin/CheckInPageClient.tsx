'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Phone, User, Mail, AlertCircle, Calendar, Clock, 
  CheckCircle2, CheckCircle, Sparkles, UserCheck, ArrowRight
} from 'lucide-react';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { RadioGroup, RadioGroupItem } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useMerchant } from '@/contexts/merchant-context';
import { bookingApi } from '@/lib/booking-api';
import { format } from 'date-fns';

interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  // allergies: string;
  // referralSource: string;
}

interface TodayBooking {
  id: string;
  bookingNumber: string;
  serviceName: string;
  staffName: string;
  startTime: string;
  endTime: string;
  status: string;
}

const referralOptions = [
  { value: 'PASSING_BY', label: 'Passing By', icon: '🚶' },
  { value: 'ONLINE_SEARCH', label: 'Online Search (Google)', icon: '🔍' },
  { value: 'REFERRAL', label: 'Referral (Word of Mouth)', icon: '💬' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media', icon: '📱' },
  { value: 'ADS_FLYERS', label: 'Ads/Flyers', icon: '📰' },
  { value: 'OTHER', label: 'Other', icon: '✨' },
];

export default function CheckInPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { merchant } = useMerchant();
  
  const [step, setStep] = useState<'phone' | 'form' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    // allergies: '',
    // referralSource: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 10) {
      setPhoneNumber(formatted);
    }
  };

  const handlePhoneLookup = async () => {
    const cleanedPhone = phoneNumber.replace(/\s/g, '');
    
    if (cleanedPhone.length < 10) {
      setErrors({ phone: 'Please enter a valid 10-digit phone number' });
      return;
    }

    setIsSearching(true);
    setErrors({});

    try {
      // Look up customer by phone
      const lookupResult = await bookingApi.lookupCustomer({ phone: cleanedPhone });
      
      if (lookupResult.found && lookupResult.customer) {
        // Customer found - pre-fill form
        setCustomerData({
          id: lookupResult.customer.id,
          firstName: lookupResult.customer.firstName,
          lastName: lookupResult.customer.lastName || '',
          phone: cleanedPhone,
          email: lookupResult.customer.email || '',
          // allergies: '', // Will be filled from check-in data
          // referralSource: '', // Will be filled from check-in data
        });
        
        // Fetch today's bookings for this customer
        try {
          const bookingsResult = await bookingApi.getTodaysBookings(lookupResult.customer.id);
          setTodayBookings(bookingsResult.bookings || []);
        } catch (error) {
          console.error('Failed to fetch today\'s bookings:', error);
          setTodayBookings([]);
        }
      } else {
        // New customer - just set phone
        setCustomerData({
          ...customerData,
          phone: cleanedPhone,
        });
      }
      
      setStep('form');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Unable to look up customer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!customerData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!customerData.phone) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (customerData.email && !customerData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Submit check-in
      const result = await bookingApi.checkIn({
        phone: customerData.phone,
        firstName: customerData.firstName,
        lastName: customerData.lastName || undefined,
        email: customerData.email || undefined,
        // allergies: customerData.allergies || undefined,
        // specialRequirements: customerData.allergies || undefined, // Using allergies field for both
        // referralSource: customerData.referralSource || undefined,
      });
      
      if (result.success) {
        // Update today's bookings if we got new data
        if (result.bookings) {
          setTodayBookings(result.bookings);
        }
        
        toast({
          title: 'Welcome!',
          description: 'You have successfully checked in.',
        });
        
        setStep('success');
        
        // Reset form after 5 seconds
        setTimeout(() => {
          setStep('phone');
          setPhoneNumber('');
          setCustomerData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            // allergies: '',
            // referralSource: '',
          });
          setTodayBookings([]);
        }, 5000);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Unable to complete check-in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {merchant?.logo && (
            <img 
              src={merchant.logo} 
              alt={merchant.name} 
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900">Welcome to {merchant?.name || 'Our Business'}</h1>
          <p className="text-lg text-gray-600 mt-2">Please check in to let us know you're here</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Phone Number Entry */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Phone className="h-6 w-6" />
                    Enter Your Phone Number
                  </CardTitle>
                  <CardDescription className="text-base">
                    We'll use this to find your booking or create a new profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="phone" className="text-lg mb-2 block">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="0400 000 000"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className={cn(
                        "text-2xl py-6 px-4 text-center tracking-wider",
                        errors.phone && "border-red-500"
                      )}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handlePhoneLookup();
                      }}
                      autoFocus
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-2">{errors.phone}</p>
                    )}
                  </div>

                  <Button
                    onClick={handlePhoneLookup}
                    disabled={isSearching || phoneNumber.length < 10}
                    size="lg"
                    className="w-full text-lg py-6"
                  >
                    {isSearching ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        Looking up...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Continue
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Customer Information Form */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Today's Bookings */}
              {todayBookings.length > 0 && (
                <Card className="shadow-lg border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Your Appointments Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {todayBookings.map((booking) => (
                        <div 
                          key={booking.id}
                          className="bg-gray-50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-lg">{booking.serviceName}</p>
                              <p className="text-gray-600">with {booking.staffName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {booking.startTime} - {booking.endTime}
                              </p>
                              {booking.status === 'IN_PROGRESS' && (
                                <Badge className="mt-1 bg-teal-100 text-teal-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                              {booking.status === 'CONFIRMED' && (
                                <Badge className="mt-1" variant="secondary">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirmed
                                </Badge>
                              )}
                            </div>
                          </div>
                          {booking.status === 'CONFIRMED' && (
                            <Button
                              onClick={async () => {
                                try {
                                  await bookingApi.checkInBooking(booking.id);
                                  toast({
                                    title: 'Checked In!',
                                    description: `Your appointment has started.`,
                                  });
                                  // Update the local state
                                  setTodayBookings(prev => 
                                    prev.map(b => 
                                      b.id === booking.id 
                                        ? { ...b, status: 'IN_PROGRESS' } 
                                        : b
                                    )
                                  );
                                } catch (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to check in. Please see our staff.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              size="lg"
                              className="w-full bg-teal-600 hover:bg-teal-700"
                            >
                              CHECK IN
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Customer Details Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <UserCheck className="h-6 w-6" />
                    {customerData.id ? 'Confirm Your Details' : 'Tell Us About Yourself'}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Help us provide you with the best service
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-base">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        value={customerData.firstName}
                        onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                        className={cn(
                          "text-lg py-3",
                          errors.firstName && "border-red-500"
                        )}
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-base">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={customerData.lastName}
                        onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                        className="text-lg py-3"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="formPhone" className="text-base">
                        Phone Number *
                      </Label>
                      <Input
                        id="formPhone"
                        value={formatPhoneNumber(customerData.phone)}
                        readOnly
                        className="text-lg py-3 bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-base">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                        className={cn(
                          "text-lg py-3",
                          errors.email && "border-red-500"
                        )}
                        placeholder="john@example.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Allergies/Special Requirements - Removed until database migration */}
                  {/* Referral Source - Removed until database migration */}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setStep('phone');
                        setPhoneNumber('');
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                          Checking in...
                        </span>
                      ) : (
                        'Check In'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="shadow-lg text-center">
                <CardContent className="py-16 space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                  </motion.div>
                  
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Welcome, {customerData.firstName}!
                    </h2>
                    <p className="text-lg text-gray-600">
                      You've successfully checked in. Our staff will be with you shortly.
                    </p>
                  </div>

                  {todayBookings.length > 0 && (
                    <Alert className="max-w-md mx-auto">
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription className="text-base">
                        Your appointment for {todayBookings[0].serviceName} with {todayBookings[0].staffName} is at {todayBookings[0].startTime}
                      </AlertDescription>
                    </Alert>
                  )}

                  <p className="text-sm text-gray-500">
                    This page will reset in a few seconds...
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}