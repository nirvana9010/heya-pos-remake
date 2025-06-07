import * as crypto from 'crypto';

export function hashPin(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(pin)
    .digest('hex');
}

export function verifyPin(pin: string, hashedPin: string): boolean {
  return hashPin(pin) === hashedPin;
}

export function generateRandomPin(length: number = 4): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

export function maskPin(pin: string): string {
  return '*'.repeat(pin.length);
}

export interface PinValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePinFormat(pin: string): PinValidationResult {
  if (!pin) {
    return { valid: false, error: 'PIN is required' };
  }
  
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }
  
  if (pin.length < 4 || pin.length > 6) {
    return { valid: false, error: 'PIN must be 4-6 digits' };
  }
  
  // Check for sequential numbers
  const sequential = '0123456789';
  const reverseSequential = '9876543210';
  if (sequential.includes(pin) || reverseSequential.includes(pin)) {
    return { valid: false, error: 'PIN cannot be sequential numbers' };
  }
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, error: 'PIN cannot be all the same digit' };
  }
  
  return { valid: true };
}

export interface PinAttemptTracker {
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

export class PinAuthManager {
  private maxAttempts: number;
  private lockoutDuration: number; // in minutes
  private attempts: Map<string, PinAttemptTracker>;
  
  constructor(maxAttempts: number = 3, lockoutDuration: number = 15) {
    this.maxAttempts = maxAttempts;
    this.lockoutDuration = lockoutDuration;
    this.attempts = new Map();
  }
  
  isLocked(identifier: string): boolean {
    const tracker = this.attempts.get(identifier);
    if (!tracker || !tracker.lockedUntil) return false;
    
    if (new Date() > tracker.lockedUntil) {
      // Lockout expired, reset
      this.attempts.delete(identifier);
      return false;
    }
    
    return true;
  }
  
  recordAttempt(identifier: string, success: boolean): PinAttemptTracker {
    const tracker = this.attempts.get(identifier) || {
      attempts: 0,
      lastAttempt: new Date(),
    };
    
    if (success) {
      // Success, clear attempts
      this.attempts.delete(identifier);
      return { attempts: 0, lastAttempt: new Date() };
    }
    
    // Failed attempt
    tracker.attempts++;
    tracker.lastAttempt = new Date();
    
    if (tracker.attempts >= this.maxAttempts) {
      // Lock the account
      tracker.lockedUntil = new Date(
        Date.now() + this.lockoutDuration * 60 * 1000
      );
    }
    
    this.attempts.set(identifier, tracker);
    return tracker;
  }
  
  getRemainingAttempts(identifier: string): number {
    const tracker = this.attempts.get(identifier);
    if (!tracker) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - tracker.attempts);
  }
  
  getTimeUntilUnlock(identifier: string): number | null {
    const tracker = this.attempts.get(identifier);
    if (!tracker || !tracker.lockedUntil) return null;
    
    const remaining = tracker.lockedUntil.getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000 / 60) : null; // in minutes
  }
  
  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
}