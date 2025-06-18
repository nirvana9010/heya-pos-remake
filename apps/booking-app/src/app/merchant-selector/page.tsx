'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import Link from 'next/link';
import { Building2, MapPin, Phone } from 'lucide-react';

const testMerchants = [
  {
    subdomain: 'hamilton',
    name: 'Hamilton Beauty Spa',
    description: 'Premium beauty and wellness spa in Hamilton',
    address: '123 Beauty Street, Hamilton NSW',
    phone: '+61 2 9456 7890',
    theme: 'from-pink-500 to-purple-600',
  },
  {
    subdomain: 'zen-wellness',
    name: 'Zen Wellness Spa',
    description: 'Holistic wellness and relaxation spa',
    address: '456 Wellness Way, Melbourne VIC',
    phone: '+61 3 9876 5432',
    theme: 'from-green-500 to-teal-600',
  },
];

export default function MerchantSelector() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Select a Business
          </h1>
          <p className="text-xl text-gray-600">
            Choose which business you'd like to book with
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              <span className="font-semibold">Development Mode</span>
              <span className="mx-2">•</span>
              <span>Multi-tenant Testing</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testMerchants.map((merchant) => (
            <Card key={merchant.subdomain} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 bg-gradient-to-r ${merchant.theme}`} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{merchant.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {merchant.description}
                    </CardDescription>
                  </div>
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{merchant.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="text-sm">{merchant.phone}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link href={`/${merchant.subdomain}`}>
                      Visit Booking Site
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/${merchant.subdomain}/services`}>
                      View Services
                    </Link>
                  </Button>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                  <div className="font-semibold mb-1">Test URL:</div>
                  <code className="block bg-white p-2 rounded border">
                    http://localhost:3001/{merchant.subdomain}
                  </code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">How Multi-Tenant URLs Work</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800">
              <p className="mb-4">
                Each merchant has their own unique subdomain that provides a completely isolated booking experience:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">•</span>
                  <span><strong>Path-based (Development):</strong> <code>localhost:3001/[merchant-subdomain]</code></span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">•</span>
                  <span><strong>Subdomain-based (Production):</strong> <code>[merchant-subdomain].bookings.com</code></span>
                </li>
              </ul>
              <p className="mt-4 text-sm">
                Try visiting an invalid merchant URL like <code>/invalid-merchant</code> to see the error handling.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}