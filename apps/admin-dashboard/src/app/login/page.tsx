'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      // Redirect handled by auth context
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Dev only - Auto login button and demo credentials */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('admin123');
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
              
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>Demo credentials (dev only):</p>
                <p className="font-mono">admin / admin123</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}