"use client";

import React, { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { useMerchant } from "@/contexts/merchant-context";
import { formatAddress } from "@heya-pos/utils";

// Helper function to format time from 24h to 12h format
function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Days of the week in order
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ContactPage() {
  const { merchant, loading, error } = useMerchant();
  
  // Debug logging
  React.useEffect(() => {
    if (merchant) {
      console.log('[ContactPage] Current merchant:', {
        name: merchant.name,
        email: merchant.email,
        subdomain: merchant.subdomain,
        businessHours: merchant.businessHours
      });
    }
  }, [merchant]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Contact form submitted:", formData);
    // TODO: Implement form submission to send email
  };

  if (loading) {
    return (
      <main className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !merchant) {
    return (
      <main className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Unable to Load Contact Information</h1>
            <p className="text-muted-foreground">Please try again later.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact {merchant.name}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have a question or want to learn more about our services? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
                <CardDescription>
                  Visit us at our salon or reach out through any of the channels below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Visit Us</h3>
                    <p className="text-muted-foreground">
                      {merchant.address}<br />
                      {formatAddress('', merchant.suburb, merchant.state, merchant.postalCode)}<br />
                      Australia
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Call Us</h3>
                    <p className="text-muted-foreground">
                      {merchant.phone || 'Not available'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Email Us</h3>
                    <p className="text-muted-foreground">
                      {merchant.email || 'Not available'}<br />
                      We&apos;ll respond within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Opening Hours</h3>
                    <div className="text-muted-foreground space-y-1">
                      {merchant.businessHours ? (
                        DAYS_OF_WEEK.map((day) => {
                          // Try both lowercase and capitalized versions
                          const hours = merchant.businessHours[day] || 
                                       merchant.businessHours[day.charAt(0).toUpperCase() + day.slice(1)];
                          
                          // Check for both formats: {open, close} and {isOpen, openTime, closeTime}
                          if (!hours || hours.closed === true) {
                            return (
                              <p key={day} className="capitalize">
                                {day}: Closed
                              </p>
                            );
                          }
                          
                          // Handle both possible formats
                          const openTime = hours.open || hours.openTime;
                          const closeTime = hours.close || hours.closeTime;
                          const isOpen = hours.isOpen !== false && !hours.closed && openTime && closeTime;
                          
                          if (!isOpen) {
                            return (
                              <p key={day} className="capitalize">
                                {day}: Closed
                              </p>
                            );
                          }
                          
                          return (
                            <p key={day} className="capitalize">
                              {day}: {formatTime(openTime)} - {formatTime(closeTime)}
                            </p>
                          );
                        })
                      ) : (
                        <p>Opening hours not available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map placeholder */}
            <Card>
              <CardContent className="p-0">
                <div className="h-64 bg-secondary rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Map Location</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we&apos;ll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us how we can help you..."
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <section className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How do I book an appointment?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You can book an appointment through our online booking system by clicking the &quot;Book Appointment&quot; 
                  button on any page. Alternatively, you can call us during business hours.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What is your cancellation policy?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We require at least 24 hours notice for cancellations. Late cancellations or no-shows may 
                  incur a fee. Please contact us as soon as possible if you need to reschedule.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer gift certificates?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! We offer gift certificates for any amount or specific services. They make perfect gifts 
                  for birthdays, holidays, or any special occasion. Visit us in-store or call to purchase.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is parking available?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, we have free parking available for our clients in the building&apos;s parking lot. 
                  Street parking is also available nearby with meters.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}