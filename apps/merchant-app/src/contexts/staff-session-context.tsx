'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import { useIdleDetection } from '@/hooks/use-idle-detection';
import { LockScreenOverlay, type LockState } from '@/components/lock-screen/LockScreenOverlay';

interface ActiveStaff {
  id: string;
  firstName: string;
  lastName: string;
  accessLevel: number;
  role: string;
}

interface StaffSessionContextValue {
  /** Currently identified staff member, null when locked */
  activeStaff: ActiveStaff | null;
  /** Current lock screen state */
  lockState: LockState;
  /** Whether the lock screen feature is enabled for this session */
  isLockScreenEnabled: boolean;
  /** Attempt to unlock with a PIN */
  unlockWithPin: (pin: string) => Promise<void>;
  /** Lock the screen immediately */
  lock: () => void;
  /** Continue working after a transaction (resets idle timer) */
  continueWorking: () => void;
  /** Show the post-transaction prompt */
  showPostTransactionPrompt: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextValue | null>(null);

const SESSION_KEYS = {
  ACTIVE_STAFF_ID: 'active_staff_id',
  ACTIVE_STAFF_SESSION: 'active_staff_session',
} as const;

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const { merchant, user } = useAuth();
  const [lockState, setLockState] = useState<LockState>('LOCKED');
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [featureChecked, setFeatureChecked] = useState(false);
  const lockStateRef = useRef<LockState>('LOCKED');

  // Keep ref in sync for callbacks that shouldn't re-render
  lockStateRef.current = lockState;

  // Determine if feature should be active
  const isOwner = user?.type === 'merchant' || user?.permissions?.includes('*');
  const isMerchantUser = user?.type === 'merchant_user';
  const settingEnabled = merchant?.settings?.staffPinLockEnabled === true;

  // Check feature eligibility on mount
  useEffect(() => {
    if (!settingEnabled || !isMerchantUser || isOwner) {
      setFeatureEnabled(false);
      setFeatureChecked(true);
      return;
    }

    // Feature toggle is on and user is merchant_user — check if staff have PINs
    let cancelled = false;
    apiClient.auth.getStaffPinStatus().then((status) => {
      if (cancelled) return;
      if (status.hasPins) {
        setFeatureEnabled(true);
      } else {
        setFeatureEnabled(false);
      }
      setFeatureChecked(true);
    }).catch(() => {
      if (!cancelled) {
        setFeatureEnabled(false);
        setFeatureChecked(true);
      }
    });

    return () => { cancelled = true; };
  }, [settingEnabled, isMerchantUser, isOwner]);

  // Restore session from sessionStorage
  useEffect(() => {
    if (!featureEnabled) return;

    try {
      const savedSession = sessionStorage.getItem(SESSION_KEYS.ACTIVE_STAFF_SESSION);
      if (savedSession) {
        const staff = JSON.parse(savedSession) as ActiveStaff;
        setActiveStaff(staff);
        setLockState('ACTIVE');
      }
    } catch {
      // Corrupted session data, stay locked
    }
  }, [featureEnabled]);

  // Idle detection callbacks
  const handleWarning = useCallback(() => {
    if (lockStateRef.current === 'ACTIVE') {
      setLockState('WARNING');
    }
  }, []);

  const handleLock = useCallback(() => {
    if (lockStateRef.current === 'ACTIVE' || lockStateRef.current === 'WARNING') {
      setLockState('LOCKED');
      setActiveStaff(null);
      sessionStorage.removeItem(SESSION_KEYS.ACTIVE_STAFF_ID);
      sessionStorage.removeItem(SESSION_KEYS.ACTIVE_STAFF_SESSION);
    }
  }, []);

  const { resetTimer } = useIdleDetection({
    warningAfter: 50,
    lockAfter: 60,
    onWarning: handleWarning,
    onLock: handleLock,
    enabled: featureEnabled && (lockState === 'ACTIVE' || lockState === 'WARNING'),
  });

  const unlockWithPin = useCallback(async (pin: string) => {
    setPinError(null);
    setIsVerifying(true);
    try {
      const result = await apiClient.auth.unlockByPin(pin);
      const staff = result.staff;
      setActiveStaff(staff);
      setLockState('ACTIVE');
      setPinError(null);

      // Persist to sessionStorage
      sessionStorage.setItem(SESSION_KEYS.ACTIVE_STAFF_ID, staff.id);
      sessionStorage.setItem(SESSION_KEYS.ACTIVE_STAFF_SESSION, JSON.stringify(staff));
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Invalid PIN';
      setPinError(message);
      throw err; // Re-throw so PinPad can clear digits
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const lock = useCallback(() => {
    setLockState('LOCKED');
    setActiveStaff(null);
    setPinError(null);
    sessionStorage.removeItem(SESSION_KEYS.ACTIVE_STAFF_ID);
    sessionStorage.removeItem(SESSION_KEYS.ACTIVE_STAFF_SESSION);
  }, []);

  const continueWorking = useCallback(() => {
    setLockState('ACTIVE');
    resetTimer();
  }, [resetTimer]);

  const showPostTransactionPrompt = useCallback(() => {
    if (featureEnabled && lockStateRef.current === 'ACTIVE') {
      setLockState('POST_TRANSACTION');
    }
  }, [featureEnabled]);

  const handleImHere = useCallback(() => {
    setLockState('ACTIVE');
    resetTimer();
  }, [resetTimer]);

  // Listen for payment:completed events
  useEffect(() => {
    if (!featureEnabled) return;

    const handlePaymentCompleted = () => {
      if (lockStateRef.current === 'ACTIVE') {
        setLockState('POST_TRANSACTION');
      }
    };

    window.addEventListener('payment:completed', handlePaymentCompleted);
    return () => window.removeEventListener('payment:completed', handlePaymentCompleted);
  }, [featureEnabled]);

  // Clean up on auth logout
  useEffect(() => {
    const handleLogout = () => {
      sessionStorage.removeItem(SESSION_KEYS.ACTIVE_STAFF_ID);
      sessionStorage.removeItem(SESSION_KEYS.ACTIVE_STAFF_SESSION);
    };
    // Listen for auth clear event from base client
    window.addEventListener('auth:unauthorized', handleLogout);
    return () => window.removeEventListener('auth:unauthorized', handleLogout);
  }, []);

  const staffName = activeStaff
    ? activeStaff.lastName
      ? `${activeStaff.firstName} ${activeStaff.lastName}`
      : activeStaff.firstName
    : undefined;

  const contextValue = useMemo<StaffSessionContextValue>(() => ({
    activeStaff,
    lockState,
    isLockScreenEnabled: featureEnabled,
    unlockWithPin,
    lock,
    continueWorking,
    showPostTransactionPrompt,
  }), [activeStaff, lockState, featureEnabled, unlockWithPin, lock, continueWorking, showPostTransactionPrompt]);

  // If feature isn't ready yet, just render children
  if (!featureChecked) {
    return <StaffSessionContext.Provider value={contextValue}>{children}</StaffSessionContext.Provider>;
  }

  return (
    <StaffSessionContext.Provider value={contextValue}>
      {children}
      {featureEnabled && lockState !== 'ACTIVE' && (
        <LockScreenOverlay
          lockState={lockState}
          activeStaffName={staffName}
          onUnlock={unlockWithPin}
          onImHere={handleImHere}
          onDone={lock}
          onContinueWorking={continueWorking}
          error={pinError}
          isLoading={isVerifying}
          merchantName={merchant?.name}
        />
      )}
    </StaffSessionContext.Provider>
  );
}

export function useStaffSession(): StaffSessionContextValue {
  const context = useContext(StaffSessionContext);
  if (!context) {
    throw new Error('useStaffSession must be used within a StaffSessionProvider');
  }
  return context;
}
