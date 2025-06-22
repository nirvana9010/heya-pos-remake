'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { Checkbox } from '@heya-pos/ui';
import { useAuth } from '@/lib/auth/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error: authError, clearError } = useAuth();
  
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/calendar');
    }
  }, [isAuthenticated, isLoading, router]);

  // Clear auth errors when component mounts
  useEffect(() => {
    clearError();
  }, []); // Empty dependency array - only run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(formData.username, formData.password, rememberMe);
      // Auth provider will handle the redirect through the useEffect above
    } catch (err) {
      // Error is handled by the auth provider and available via authError
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Merchant Login</CardTitle>
          <CardDescription>
            Enter your merchant credentials to access the POS system
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
                type="email"
                placeholder="your@email.com"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Dev only - Auto login button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFormData({
                    username: 'admin@hamiltonbeauty.com',
                    password: 'demo123'
                  });
                  // Auto submit after a short delay
                  setTimeout(() => {
                    document.querySelector('form')?.requestSubmit();
                  }, 100);
                }}
                disabled={isLoading}
              >
                🚀 Quick Login (Dev Only)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Test Credentials Info */}
      <Card className="w-full max-w-md mt-4 bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Test Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-blue-900">Test Merchant Login:</p>
            <p className="text-sm text-blue-700">Email: admin@hamiltonbeauty.com</p>
            <p className="text-sm text-blue-700">Password: demo123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}