"use client";

import { Award, Users, Heart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@heya-pos/ui";
import { useMerchant } from "@/contexts/merchant-context";
import { MerchantGuard } from "@/components/merchant-guard";

const values = [
  {
    icon: Award,
    title: "Excellence",
    description: "We strive for excellence in every service we provide, using only the best products and techniques.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Building lasting relationships with our clients and being a positive part of our local community.",
  },
  {
    icon: Heart,
    title: "Passion",
    description: "Our team is passionate about beauty and wellness, dedicated to helping you look and feel your best.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    description: "Staying ahead with the latest trends and techniques in the beauty industry.",
  },
];

const team = [
  {
    name: "Emma Wilson",
    role: "Senior Stylist",
    bio: "With over 10 years of experience, Emma specializes in creative color and cutting-edge styles.",
  },
  {
    name: "James Brown",
    role: "Master Barber",
    bio: "James brings precision and artistry to every cut, specializing in modern and classic men's styles.",
  },
  {
    name: "Sophie Chen",
    role: "Beauty Therapist",
    bio: "Sophie is our skincare expert, offering personalized treatments for all skin types.",
  },
  {
    name: "Michael Davis",
    role: "Massage Therapist",
    bio: "Michael's healing hands provide therapeutic massages that relieve stress and promote wellness.",
  },
];

export default function AboutPage() {
  const { merchant, merchantSubdomain } = useMerchant();
  const isZen = merchantSubdomain === 'zen-wellness';
  
  return (
    <MerchantGuard>
      <main className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About {merchant?.name}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {isZen ? 
                `${merchant?.name} is your sanctuary for holistic wellness and healing. Our commitment to natural therapies and personalized care has made us a trusted name in the wellness community.` :
                `For over 15 years, ${merchant?.name} has been a premier destination for luxury beauty services. Our commitment to excellence and personalized care has made us a trusted name in the community.`
              }
            </p>
          </div>

        {/* Story Section */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  {merchant?.name} began with a simple vision: 
                  to create a welcoming space where clients could relax, rejuvenate, and leave feeling 
                  their absolute best.
                </p>
                <p>
                  Our {isZen ? 'wellness center' : 'salon'} has grown from humble beginnings to a full-service {isZen ? 'wellness' : 'beauty'} destination. Throughout our 
                  journey, we&apos;ve remained true to our core values of quality, personalization, and 
                  exceptional customer service.
                </p>
                <p>
                  Today, {merchant?.name} is home to a team of talented professionals who share our 
                  commitment to excellence. We continue to evolve with the industry, embracing new 
                  techniques and technologies while maintaining the personal touch that our clients love.
                </p>
              </div>
            </div>
            <div className="bg-secondary rounded-lg h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Salon Image</p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index}>
                  <CardContent className="pt-6 text-center">
                    <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Team Section */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-center mb-1">{member.name}</h3>
                  <p className="text-primary text-sm text-center mb-3">{member.role}</p>
                  <p className="text-sm text-muted-foreground text-center">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
    </MerchantGuard>
  );
}