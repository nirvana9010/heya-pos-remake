"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, ChevronRight, Calendar, User, Clock, UserCircle, CheckCircle,
  Sparkles, Shield, CalendarCheck, Star, MapPin, Phone, Mail, Download,
  Zap, CalendarDays, Sun, Cloud, Moon
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

const steps = [
  { id: 1, name: "Service", icon: CheckCircle },
  { id: 2, name: "Staff", icon: User },
  { id: 3, name: "Date & Time", icon: Calendar },
  { id: 4, name: "Your Details", icon: UserCircle },
  { id: 5, name: "Confirmation", icon: CheckCircle },
];

// Customer Form Component - Outside of BookingPage to prevent re-creation
const CustomerFormComponent = React.memo(({ 
  customerInfo, 
  onCustomerInfoChange 
}: { 
  customerInfo: any, 
  onCustomerInfoChange: (info: any) => void 
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
        <h3 className="text-lg font-medium mb-2">Almost there!</h3>
        <p className="text-sm text-muted-foreground">
          We just need a few details to confirm your booking
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