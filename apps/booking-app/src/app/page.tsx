"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Phone, Star, Users, ChevronRight, Sparkles, Heart, Leaf } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { useMerchant } from "@/contexts/merchant-context";
import { MerchantGuard } from "@/components/merchant-guard";

// Merchant-specific content
const merchantContent = {
  hamilton: {
    hero: {
      title: "Where Beauty Meets Excellence",
      subtitle: "Sydney's premier beauty destination offering cutting-edge treatments and personalized care.",
      gradient: "from-pink-500 to-purple-600",
    },
    services: [
      { id: "1", name: "Signature Facial", price: 120, duration: 75, category: "Beauty", featured: true },
      { id: "2", name: "Luxury Hair Treatment", price: 180, duration: 90, category: "Hair" },
      { id: "3", name: "Gel Manicure", price: 65, duration: 45, category: "Nails" },
      { id: "4", name: "Brow Lamination", price: 85, duration: 60, category: "Beauty" },
      { id: "5", name: "Lash Extensions", price: 150, duration: 120, category: "Beauty" },
      { id: "6", name: "Anti-Aging Treatment", price: 250, duration: 90, category: "Beauty", featured: true },
    ],
    testimonials: [
      { id: "1", name: "Jessica M.", rating: 5, text: "The best beauty spa in Sydney! Their attention to detail is unmatched." },
      { id: "2", name: "Amanda L.", rating: 5, text: "I've been coming here for years. Consistently excellent service!" },
      { id: "3", name: "Sophie R.", rating: 5, text: "The staff is incredible and the results speak for themselves." },
    ],
    address: "123 Beauty Street, Sydney NSW 2000",
    phone: "+61 2 9456 7890",
    email: "hamilton@hamiltonbeauty.com",
  },
  "zen-wellness": {
    hero: {
      title: "Find Your Inner Peace",
      subtitle: "Holistic wellness treatments that rejuvenate your body, mind, and soul in Melbourne's tranquil oasis.",
      gradient: "from-green-500 to-teal-600",
    },
    services: [
      { id: "1", name: "Deep Tissue Massage", price: 140, duration: 90, category: "Massage", featured: true },
      { id: "2", name: "Hot Stone Therapy", price: 160, duration: 90, category: "Massage" },
      { id: "3", name: "Reiki Healing", price: 120, duration: 60, category: "Wellness" },
      { id: "4", name: "Aromatherapy Session", price: 110, duration: 75, category: "Wellness" },
      { id: "5", name: "Couples Massage", price: 280, duration: 90, category: "Massage", featured: true },
      { id: "6", name: "Meditation & Mindfulness", price: 80, duration: 60, category: "Wellness" },
    ],
    testimonials: [
      { id: "1", name: "David K.", rating: 5, text: "The most relaxing experience I've ever had. Truly transformative!" },
      { id: "2", name: "Maria G.", rating: 5, text: "Their holistic approach to wellness is exactly what I needed." },
      { id: "3", name: "Tom H.", rating: 5, text: "I leave feeling refreshed and renewed every single time." },
    ],
    address: "456 Wellness Way, Melbourne VIC 3000",
    phone: "+61 3 9876 5432",
    email: "melbourne@zenwellness.com",
  },
};

export default function Home() {
  const { merchant, merchantSubdomain, loading } = useMerchant();
  
  // Get merchant-specific content
  const content = merchantContent[merchantSubdomain as keyof typeof merchantContent] || merchantContent.hamilton;
  const isZen = merchantSubdomain === 'zen-wellness';
  
  // Format address helper
  const formatAddress = (address?: string, suburb?: string, state?: string, postalCode?: string) => {
    const parts = [address, suburb, state, postalCode].filter(Boolean);
    return parts.join(', ');
  };
  
  // Format time helper
  const formatTime = (time: string | undefined) => {
    if (!time) return 'Closed';
    if (time === 'closed' || time === '') return 'Closed';
    
    // Handle 24-hour format (e.g., "09:00" -> "9:00 AM")
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  // Get business hours from merchant settings
  const businessHours = merchant?.settings?.businessHours || {};
  
  // Helper to check if a day is open
  const isDayOpen = (dayHours: any) => {
    return dayHours && !dayHours.closed && dayHours.isOpen !== false && dayHours.open && dayHours.open !== 'closed';
  };
  
  return (
    <MerchantGuard>
      <main className="min-h-screen">
      {/* Hero Section */}
      <section className={`relative bg-gradient-to-br ${content.hero.gradient} text-white`}>
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              {isZen ? <Leaf className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
              <span className="text-lg font-semibold">{merchant?.name}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {content.hero.title}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={`/${merchantSubdomain}/booking`}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Book Appointment
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href={`/${merchantSubdomain}/services`}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-white hover:bg-white hover:text-primary">
                  View Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Business Info */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <MapPin className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Location</h3>
                <p className="text-muted-foreground">
                  {merchant?.address || ''}<br />
                  {formatAddress('', merchant?.suburb, merchant?.state, merchant?.postalCode).replace(/^, /, '')}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Opening Hours</h3>
                <p className="text-muted-foreground">
                  {loading ? (
                    'Loading...'
                  ) : (
                    <>
                      {isDayOpen(businessHours.monday) && isDayOpen(businessHours.friday) && 
                       businessHours.monday?.open === businessHours.tuesday?.open && 
                       businessHours.monday?.open === businessHours.wednesday?.open && 
                       businessHours.monday?.open === businessHours.thursday?.open && 
                       businessHours.monday?.open === businessHours.friday?.open &&
                       businessHours.monday?.close === businessHours.tuesday?.close && 
                       businessHours.monday?.close === businessHours.wednesday?.close && 
                       businessHours.monday?.close === businessHours.thursday?.close && 
                       businessHours.monday?.close === businessHours.friday?.close ? (
                        <>Mon - Fri: {formatTime(businessHours.monday?.open)} - {formatTime(businessHours.monday?.close)}<br /></>
                      ) : (
                        <>Mon - Fri: Various hours<br /></>
                      )}
                      {isDayOpen(businessHours.saturday) && isDayOpen(businessHours.sunday) && 
                       businessHours.saturday?.open === businessHours.sunday?.open &&
                       businessHours.saturday?.close === businessHours.sunday?.close ? (
                        <>Sat - Sun: {formatTime(businessHours.saturday?.open)} - {formatTime(businessHours.saturday?.close)}</>
                      ) : (
                        <>Sat - Sun: Various hours</>
                      )}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Phone className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Contact</h3>
                <p className="text-muted-foreground">
                  {merchant?.phone || 'No phone available'}<br />
                  {merchant?.email || 'No email available'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Popular Services</h2>
            <p className="text-lg text-muted-foreground">
              Discover our most requested treatments
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {content.services.slice(0, 6).map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow duration-200 relative overflow-hidden">
                {service.featured && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-400 text-white px-3 py-1 text-xs font-semibold">
                    Popular
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <Badge variant="outline" className="mt-2">{service.category}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${service.price}</p>
                      <p className="text-sm text-muted-foreground">{service.duration} min</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={`/${merchantSubdomain}/booking`}>
                    <Button className="w-full" variant="outline">
                      Book Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href={`/${merchantSubdomain}/services`}>
              <Button variant="outline" size="lg">
                View All Services
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-lg text-muted-foreground">
              {isZen ? 'Hear from our wellness community' : "Don't just take our word for it"}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {content.testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">{testimonial.text}</p>
                  <p className="font-semibold">- {testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isZen ? 'Begin Your Wellness Journey' : 'Ready to Look Your Best?'}
          </h2>
          <p className="text-xl mb-8 text-white/90">
            {isZen ? 
              `Book your session today and discover the path to holistic wellness at ${merchant?.name}` :
              `Book your appointment today and experience the ${merchant?.name} difference`
            }
          </p>
          <Link href={`/${merchantSubdomain}/booking`}>
            <Button size="lg" variant="secondary">
              Book Your Appointment
              <Calendar className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
    </MerchantGuard>
  )
}