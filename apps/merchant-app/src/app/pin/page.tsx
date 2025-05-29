'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heya-pos/ui';
import { Alert, AlertDescription } from '@heya-pos/ui';
import { apiClient } from '@/lib/api-client';

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (!userData || !token) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
  }, [router]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when 4 digits are entered
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (pinCode: string = pin) => {
    setError('');
    setLoading(true);

    try {
      const user = await apiClient.verifyPin(pinCode);

      // Store user data
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('pin_verified', 'true');
      sessionStorage.setItem('pin_verified_at', new Date().toISOString());

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const PinDot = ({ filled }: { filled: boolean }) => (
    <div className={`w-4 h-4 rounded-full border-2 ${
      filled ? 'bg-primary border-primary' : 'border-gray-300'
    }`} />
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter PIN</CardTitle>
          <CardDescription>
            Welcome back, {user?.name || 'User'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center space-x-4">
            {[0, 1, 2, 3].map((i) => (
              <PinDot key={i} filled={i < pin.length} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                className="h-16 text-xl"
                onClick={() => handlePinInput(num.toString())}
                disabled={loading || pin.length >= 4}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl"
              onClick={handleClear}
              disabled={loading || pin.length === 0}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl"
              onClick={() => handlePinInput('0')}
              disabled={loading || pin.length >= 4}
            >
              0
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl col-span-1"
              onClick={() => router.push('/login')}
              disabled={loading}
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}