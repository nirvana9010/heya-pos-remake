'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Palette, Database, CreditCard, ShieldCheck, Zap, Calendar, Users, Settings, ArrowRight, FlaskConical } from 'lucide-react';

export default function TestPage() {
  const router = useRouter();

  const testPages = [
    {
      title: 'Theme Comparison',
      description: 'Compare mint vs blush+sage themes side by side',
      path: '/test-theme',
      icon: Palette,
      category: 'UI/UX',
      status: 'active'
    },
    {
      title: 'API Test',
      description: 'Test API endpoints and authentication',
      path: '/test-api',
      icon: Database,
      category: 'Backend',
      status: 'active'
    },
    {
      title: 'CSS Debug',
      description: 'Debug CSS variables and styling issues',
      path: '/test-css',
      icon: Palette,
      category: 'UI/UX',
      status: 'active'
    },
    {
      title: 'Focus Test',
      description: 'Test focus states and keyboard navigation',
      path: '/test-focus',
      icon: ShieldCheck,
      category: 'Accessibility',
      status: 'active'
    },
    {
      title: 'Settings Test',
      description: 'Test merchant settings functionality',
      path: '/test-settings',
      icon: Settings,
      category: 'Features',
      status: 'active'
    },
    {
      title: 'UI Components Test',
      description: 'Test shadcn/ui components for transparency issues',
      path: '/test-ui',
      icon: FlaskConical,
      category: 'UI/UX',
      status: 'active'
    }
  ];

  const demoRoutes = [
    {
      title: 'Merchant Dashboard (Mint)',
      description: 'Original mint theme dashboard',
      path: '/dashboard',
      icon: Zap,
      theme: 'mint'
    },
    {
      title: 'Merchant Dashboard (Blush+Sage)',
      description: 'Luxury spa theme dashboard',
      path: '/merchant-sage',
      icon: Zap,
      theme: 'blush'
    },
    {
      title: 'Booking App (Mint)',
      description: 'Customer booking with mint theme',
      path: 'http://localhost:3001/booking',
      icon: Calendar,
      theme: 'mint',
      external: true
    },
    {
      title: 'Booking App (Blush+Sage)',
      description: 'Customer booking with luxury theme',
      path: 'http://localhost:3001/booking-sage',
      icon: Calendar,
      theme: 'blush',
      external: true
    }
  ];

  const categories = Array.from(new Set(testPages.map(page => page.category)));

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600">
            <FlaskConical className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Test Pages Directory</h1>
            <p className="text-muted-foreground">Development and testing tools for Heya POS</p>
          </div>
        </div>
      </div>

      {/* Demo Routes Section */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Live Demo Routes
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {demoRoutes.map((route) => (
            <Card 
              key={route.path}
              className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5"
              onClick={() => {
                if (route.external) {
                  window.open(route.path, '_blank');
                } else {
                  router.push(route.path);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      route.theme === 'mint' ? 'bg-teal-100 text-teal-600' : 'bg-pink-100 text-pink-600'
                    }`}>
                      <route.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{route.title}</CardTitle>
                      <CardDescription className="text-sm mt-0.5">{route.description}</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Test Pages by Category */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-purple-500" />
          Test Pages
        </h2>
        
        {categories.map(category => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {category}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testPages
                .filter(page => page.category === category)
                .map((page) => (
                  <Card 
                    key={page.path}
                    className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                    onClick={() => router.push(page.path)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                          <page.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{page.title}</CardTitle>
                          <CardDescription className="text-sm mt-0.5">{page.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          page.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {page.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {page.path}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-10 p-6 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-3">Quick Development Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/settings')}
          >
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('http://localhost:3000/api', '_blank')}
          >
            API Docs
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('http://localhost:3001', '_blank')}
          >
            Booking App
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-sm text-muted-foreground">
        <p className="mb-2">
          <strong>Note:</strong> This page is only visible in development mode. Test pages are excluded from production builds.
        </p>
        <p>
          To add a new test page, create it in <code className="bg-muted px-1 py-0.5 rounded">src/app/test-*/</code> and add it to the list above.
        </p>
      </div>
    </div>
  );
}