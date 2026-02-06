'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { Button } from '@heya-pos/ui';
import { PinPad } from './PinPad';

export type LockState = 'LOCKED' | 'ACTIVE' | 'WARNING' | 'POST_TRANSACTION';

interface LockScreenOverlayProps {
  lockState: LockState;
  activeStaffName?: string;
  onUnlock: (pin: string) => Promise<void>;
  onImHere: () => void;
  onDone: () => void;
  onContinueWorking: () => void;
  error?: string | null;
  isLoading?: boolean;
  merchantName?: string;
}

export function LockScreenOverlay({
  lockState,
  activeStaffName,
  onUnlock,
  onImHere,
  onDone,
  onContinueWorking,
  error,
  isLoading,
  merchantName,
}: LockScreenOverlayProps) {
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Warning countdown timer
  useEffect(() => {
    if (lockState === 'WARNING') {
      setCountdown(10);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [lockState]);

  // Don't render anything when active
  if (lockState === 'ACTIVE') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2.5rem',
          maxWidth: '400px',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {lockState === 'LOCKED' && (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={28} color="#6b7280" />
            </div>
            {merchantName && (
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                {merchantName}
              </h2>
            )}
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Enter your staff PIN to continue
            </p>
            <PinPad onSubmit={onUnlock} error={error} isLoading={isLoading} />
          </>
        )}

        {lockState === 'WARNING' && (
          <>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                {countdown}
              </span>
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              Are you still there?
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
              Screen will lock in {countdown} second{countdown !== 1 ? 's' : ''}
            </p>
            <Button
              onClick={onImHere}
              style={{ width: '100%' }}
              size="lg"
            >
              I'm here{activeStaffName ? `, ${activeStaffName}` : ''}
            </Button>
            <div style={{ width: '100%' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                Or enter a different PIN to switch staff
              </p>
              <PinPad onSubmit={onUnlock} error={error} isLoading={isLoading} />
            </div>
          </>
        )}

        {lockState === 'POST_TRANSACTION' && (
          <>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              Transaction Complete
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <Button
                variant="outline"
                onClick={onContinueWorking}
                style={{ flex: 1 }}
                size="lg"
              >
                Continue Working
              </Button>
              <Button
                onClick={onDone}
                style={{ flex: 1 }}
                size="lg"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
