export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Australian phone numbers
  if (cleaned.startsWith('04') && cleaned.length === 10) return true; // Mobile
  if (cleaned.startsWith('0') && cleaned.length === 10) return true; // Landline
  if (cleaned.startsWith('61') && cleaned.length === 11) return true; // International
  
  return false;
}

export function isValidABN(abn: string): boolean {
  // Australian Business Number validation
  const cleaned = abn.replace(/\s/g, '');
  
  if (!/^\d{11}$/.test(cleaned)) {
    return false;
  }
  
  // ABN checksum validation
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(cleaned[i]);
    const weight = i === 0 ? digit - 1 : digit;
    sum += weight * weights[i];
  }
  
  return sum % 89 === 0;
}

export function isValidPostcode(postcode: string, state?: string): boolean {
  const cleaned = postcode.replace(/\s/g, '');
  
  if (!/^\d{4}$/.test(cleaned)) {
    return false;
  }
  
  const code = parseInt(cleaned);
  
  // Australian postcode ranges by state
  const ranges: Record<string, [number, number][]> = {
    NSW: [[1000, 2599], [2619, 2899], [2921, 2999]],
    VIC: [[3000, 3999], [8000, 8999]],
    QLD: [[4000, 4999], [9000, 9999]],
    SA: [[5000, 5799], [5800, 5999]],
    WA: [[6000, 6797], [6800, 6999]],
    TAS: [[7000, 7799], [7800, 7999]],
    NT: [[800, 899], [900, 999]],
    ACT: [[200, 299], [2600, 2618], [2900, 2920]],
  };
  
  if (state && ranges[state]) {
    return ranges[state].some(([min, max]) => code >= min && code <= max);
  }
  
  // Check if it's within any valid range
  return Object.values(ranges).some(stateRanges =>
    stateRanges.some(([min, max]) => code >= min && code <= max)
  );
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isValidCurrency(amount: number): boolean {
  return amount >= 0 && Number.isFinite(amount) && 
    Math.round(amount * 100) / 100 === amount;
}

export function isValidPercentage(value: number): boolean {
  return value >= 0 && value <= 100;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidSubdomain(subdomain: string): boolean {
  // Alphanumeric and hyphens, 3-63 characters
  return /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(subdomain);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateBookingTime(
  startTime: Date,
  endTime: Date,
  minAdvanceHours: number = 0,
  maxAdvanceDays: number = 90
): { valid: boolean; error?: string } {
  const now = new Date();
  
  // Check if start time is in the past
  if (startTime < now) {
    return { valid: false, error: 'Booking cannot be in the past' };
  }
  
  // Check minimum advance booking
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart < minAdvanceHours) {
    return { 
      valid: false, 
      error: `Bookings must be made at least ${minAdvanceHours} hours in advance` 
    };
  }
  
  // Check maximum advance booking
  const daysUntilStart = hoursUntilStart / 24;
  if (daysUntilStart > maxAdvanceDays) {
    return { 
      valid: false, 
      error: `Bookings cannot be made more than ${maxAdvanceDays} days in advance` 
    };
  }
  
  // Check if end time is after start time
  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  return { valid: true };
}

export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}