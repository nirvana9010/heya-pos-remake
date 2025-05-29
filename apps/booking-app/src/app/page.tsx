"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Phone, Star, Users, ChevronRight } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";

const services = [
  { id: "1", name: "Haircut & Style", price: 65, duration: 45, category: "Hair" },
  { id: "2", name: "Hair Color", price: 150, duration: 120, category: "Hair" },
  { id: "3", name: "Facial Treatment", price: 90, duration: 60, category: "Beauty" },
  { id: "4", name: "Manicure", price: 45, duration: 30, category: "Nails" },
  { id: "5", name: "Massage", price: 120, duration: 60, category: "Wellness" },
  { id: "6", name: "Pedicure", price: 55, duration: 45, category: "Nails" },
];

const testimonials = [
  { id: "1", name: "Sarah J.", rating: 5, text: "Amazing service! The staff is professional and friendly." },
  { id: "2", name: "Michael C.", rating: 5, text: "Best salon experience I've had. Highly recommend!" },
  { id: "3", name: "Emily B.", rating: 5, text: "Love the atmosphere and quality of service here." },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-accent text-white">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Hamilton Beauty
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Experience luxury beauty services with our expert team. Book your appointment online in just a few clicks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/booking">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Book Appointment
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white hover:bg-white hover:text-primary">
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
                  123 Beauty Street<br />
                  Sydney NSW 2000
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Opening Hours</h3>
                <p className="text-muted-foreground">
                  Mon - Fri: 9:00 AM - 7:00 PM<br />
                  Sat - Sun: 10:00 AM - 6:00 PM
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Phone className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Contact</h3>
                <p className="text-muted-foreground">
                  (02) 9876 5432<br />
                  info@hamiltonbeauty.com.au
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
            {services.slice(0, 6).map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow duration-200">
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
                  <Link href="/booking">
                    <Button className="w-full" variant="outline">
                      Book Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/services">
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
              Don&apos;t just take our word for it
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
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
            Ready to Look Your Best?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Book your appointment today and experience the Hamilton Beauty difference
          </p>
          <Link href="/booking">
            <Button size="lg" variant="secondary">
              Book Your Appointment
              <Calendar className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}