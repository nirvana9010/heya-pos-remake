'use client';

import { MockPaymentForm } from './payment/MockPaymentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { DollarSign, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentStepProps {
  amount: number;
  currency?: string;
  onPaymentSuccess: () => void;
  onCancel: () => void;
  service?: {
    name: string;
    duration: number;
    price: number;
  };
  services?: Array<{
    name: string;
    duration: number;
    price: number;
  }>;
  date: Date;
  time: string;
  staffName?: string;
  customerName: string;
  cancellationHours?: number;
}

export function PaymentStep({
  amount,
  currency = 'AUD',
  onPaymentSuccess,
  onCancel,
  service,
  services,
  date,
  time,
  staffName,
  customerName,
  cancellationHours = 24,
}: PaymentStepProps) {
  // Support both single service (legacy) and multiple services
  const servicesList = services || (service ? [service] : []);
  const totalDuration = servicesList.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = servicesList.reduce((sum, s) => sum + s.price, 0);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-5 gap-6">
        {/* Booking Summary - Left Side */}
        <div className="md:col-span-2">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
              <CardDescription>Review your appointment details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Customer</p>
                <p className="font-medium">{customerName}</p>
              </div>

              {/* Services */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Service{servicesList.length > 1 ? 's' : ''}
                </p>
                {servicesList.map((svc, index) => (
                  <div key={index} className={index > 0 ? 'mt-2' : ''}>
                    <p className="font-medium">{svc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{svc.duration} minutes</span>
                    </div>
                  </div>
                ))}
                {servicesList.length > 1 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Total: {totalDuration} minutes
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{format(date, 'EEE, MMM d, yyyy')}</span>
                </div>
                <p className="text-sm mt-1">{time}</p>
              </div>

              {/* Staff */}
              {staffName && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Specialist</p>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{staffName}</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Service Total</span>
                  <span className="font-medium">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Deposit Required</span>
                  <span className="text-xl font-bold text-primary">${amount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The remaining balance will be due at your appointment
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Form - Right Side */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Details</CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <DollarSign className="h-3 w-3" />
                  Secure Payment
                </Badge>
              </div>
              <CardDescription>
                Enter your card details to pay the deposit and confirm your booking
              </CardDescription>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Cancellation Policy:</strong> We require at least {cancellationHours} hours notice for cancellations. 
                  Please contact us if you need to reschedule or cancel your appointment.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <MockPaymentForm
                amount={amount}
                currency={currency}
                onSuccess={onPaymentSuccess}
                onCancel={onCancel}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}