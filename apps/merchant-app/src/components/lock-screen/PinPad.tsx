'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  onSubmit: (pin: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
  label?: string;
}

export function PinPad({ onSubmit, error, isLoading = false, label }: PinPadProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);
  const submittingRef = useRef(false);

  // Auto-submit on 4th digit
  useEffect(() => {
    if (digits.length === 4 && !submittingRef.current) {
      submittingRef.current = true;
      const pin = digits.join('');
      onSubmit(pin).finally(() => {
        submittingRef.current = false;
        setDigits([]);
      });
    }
  }, [digits, onSubmit]);

  // Trigger shake animation on error
  useEffect(() => {
    if (error) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDigit = useCallback((digit: string) => {
    if (isLoading || submittingRef.current) return;
    setDigits((prev) => (prev.length < 4 ? [...prev, digit] : prev));
  }, [isLoading]);

  const handleBackspace = useCallback(() => {
    if (isLoading || submittingRef.current) return;
    setDigits((prev) => prev.slice(0, -1));
  }, [isLoading]);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || submittingRef.current) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, isLoading]);

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      {label && (
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{label}</p>
      )}

      {/* PIN dots */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          animation: shaking ? 'shake 0.5s ease-in-out' : undefined,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: digits.length > i ? 'var(--color-primary, #6366f1)' : '#d1d5db',
              backgroundColor: digits.length > i ? 'var(--color-primary, #6366f1)' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
          {error}
        </p>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Verifying...</p>
      )}

      {/* Keypad grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          maxWidth: '280px',
          width: '100%',
        }}
      >
        {buttons.flat().map((key, idx) => {
          if (key === '') {
            return <div key={idx} />;
          }
          if (key === 'back') {
            return (
              <button
                key={idx}
                onClick={handleBackspace}
                disabled={isLoading || digits.length === 0}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: digits.length > 0 ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: digits.length > 0 ? 1 : 0.3,
                  transition: 'opacity 0.15s',
                }}
              >
                <Delete size={24} color="#6b7280" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => handleDigit(key)}
              disabled={isLoading}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                background: 'white',
                fontSize: '1.5rem',
                fontWeight: '500',
                color: '#1f2937',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
              }}
              onTouchStart={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
              }}
              onTouchEnd={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
