'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { Checkbox } from '@heya-pos/ui';
import { useAuth } from '@/lib/auth/auth-provider';
import { Building2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authContext = useAuth();
  const { login, isAuthenticated, isLoading, error: authError, clearError } = authContext || {};
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Clear the redirect flag when login page loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__AUTH_REDIRECT_IN_PROGRESS__ = false;
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = searchParams.get('from');
      if (from) {
        router.push(from);
      } else {
        // Let middleware handle the default redirect based on package type
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  // Clear auth errors when component mounts
  useEffect(() => {
    if (clearError) {
      clearError();
    }
    // Clear the redirect flag when login page loads
    if (typeof window !== 'undefined') {
      (window as any).__AUTH_REDIRECT_IN_PROGRESS__ = false;
    }
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      if (login) {
        await login(formData.email, formData.password, rememberMe);
        // Auth provider will handle the redirect through the useEffect above
      }
    } catch (err: any) {
      // Error is handled by the auth provider and available via authError
      // Only log if it's not an expected auth error
      if (err?.code !== 'AUTH_IN_PROGRESS' && err?.message !== 'UNAUTHORIZED_REDIRECT') {
        // console.error('Login failed:', err?.message || err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">
              Heya POS
            </span>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your merchant dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoFocus
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isSubmitting}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              
              <a href="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700">
                Forgot password?
              </a>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
          
          {/* Only show demo credentials if explicitly enabled */}
          {process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true' && (
            <>
              <div className="mt-6 space-y-3">
                <div className="text-center text-sm text-gray-600">
                  <div className="font-medium mb-2">Demo Credentials:</div>
                  <div className="space-y-1">
                    <div>
                      <strong>Hamilton Beauty:</strong> Email: <code className="bg-gray-100 px-1 py-0.5 rounded">admin@hamiltonbeauty.com</code>, 
                      Password: <code className="bg-gray-100 px-1 py-0.5 rounded">demo123</code>
                    </div>
                    <div>
                      <strong>Zen Wellness:</strong> Email: <code className="bg-gray-100 px-1 py-0.5 rounded">lukas.tn90@gmail.com</code>, 
                      Password: <code className="bg-gray-100 px-1 py-0.5 rounded">demo456</code>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Auto login buttons for easy testing */}
              <div className="mt-4 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFormData({
                      email: 'admin@hamiltonbeauty.com',
                      password: 'demo123'
                    });
                    // Auto submit after a short delay
                    setTimeout(() => {
                      const form = document.querySelector('form');
                      if (form) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        form.dispatchEvent(submitEvent);
                      }
                    }, 100);
                  }}
                  disabled={isSubmitting}
                >
                  💅 Quick Login as Hamilton Beauty
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFormData({
                      email: 'lukas.tn90@gmail.com',
                      password: 'demo456'
                    });
                    // Auto submit after a short delay
                    setTimeout(() => {
                      const form = document.querySelector('form');
                      if (form) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        form.dispatchEvent(submitEvent);
                      }
                    }, 100);
                  }}
                  disabled={isSubmitting}
                >
                  🧘 Quick Login as Zen Wellness
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}