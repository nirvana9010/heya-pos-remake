'use client';

import * as React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './dialog';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { cn } from '../lib/utils';

export interface PinVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  actionDescription?: string;
  onVerify: (pin: string) => Promise<{
    success: boolean;
    staff?: {
      id: string;
      firstName: string;
      lastName: string;
      accessLevel: number;
      role: string;
    };
    error?: string;
  }>;
  onSuccess?: (staff: any) => void;
  onCancel?: () => void;
}

export function PinVerificationDialog({
  open,
  onOpenChange,
  action,
  actionDescription,
  onVerify,
  onSuccess,
  onCancel,
}: PinVerificationDialogProps) {
  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [attempts, setAttempts] = React.useState(3);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setAttempts(3);
    }
  }, [open]);

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
      const result = await onVerify(pinCode);
      
      if (result.success && result.staff) {
        // Success - close dialog and call success callback
        onSuccess?.(result.staff);
        onOpenChange(false);
      } else {
        // Failed - show error and clear PIN
        setError(result.error || 'Invalid PIN');
        setPin('');
        setAttempts(prev => Math.max(0, prev - 1));
        
        if (attempts <= 1) {
          // No more attempts - close dialog
          setTimeout(() => {
            onCancel?.();
            onOpenChange(false);
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setPin('');
      setAttempts(prev => Math.max(0, prev - 1));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const PinDot = ({ filled }: { filled: boolean }) => (
    <div 
      className={cn(
        "w-3 h-3 rounded-full border-2 transition-all",
        filled 
          ? "bg-primary border-primary scale-110" 
          : "border-gray-300 bg-gray-50"
      )} 
    />
  );

  // Format action name for display
  const formattedAction = action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>PIN Verification Required</DialogTitle>
          <DialogDescription>
            {actionDescription || `Enter your PIN to ${formattedAction.toLowerCase()}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">
                {error}
                {attempts > 0 && ` (${attempts} attempts remaining)`}
              </AlertDescription>
            </Alert>
          )}

          {/* PIN Dots */}
          <div className="flex justify-center space-x-3">
            {[0, 1, 2, 3].map((i) => (
              <PinDot key={i} filled={i < pin.length} />
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                className="h-14 text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handlePinInput(num.toString())}
                disabled={loading || pin.length >= 4 || attempts === 0}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              className="h-14 text-lg"
              onClick={handleClear}
              disabled={loading || pin.length === 0 || attempts === 0}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handlePinInput('0')}
              disabled={loading || pin.length >= 4 || attempts === 0}
            >
              0
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-14 text-lg"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          {/* Action hint */}
          {attempts > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              This action will be logged for security purposes
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}