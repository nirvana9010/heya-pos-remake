import { useEffect, useRef, useCallback } from 'react';

interface UseIdleDetectionOptions {
  /** Seconds of idle time before warning fires (default: 50) */
  warningAfter?: number;
  /** Seconds of idle time before lock fires (default: 60) */
  lockAfter?: number;
  /** Called when idle time reaches the warning threshold */
  onWarning?: () => void;
  /** Called when idle time reaches the lock threshold */
  onLock?: () => void;
  /** Whether detection is active */
  enabled?: boolean;
}

export function useIdleDetection({
  warningAfter = 50,
  lockAfter = 60,
  onWarning,
  onLock,
  enabled = true,
}: UseIdleDetectionOptions) {
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  const onWarningRef = useRef(onWarning);
  const onLockRef = useRef(onLock);

  // Keep refs in sync
  enabledRef.current = enabled;
  onWarningRef.current = onWarning;
  onLockRef.current = onLock;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();

    warningTimerRef.current = setTimeout(() => {
      onWarningRef.current?.();
    }, warningAfter * 1000);

    lockTimerRef.current = setTimeout(() => {
      onLockRef.current?.();
    }, lockAfter * 1000);
  }, [clearTimers, warningAfter, lockAfter]);

  const resetTimer = useCallback(() => {
    if (!enabledRef.current) return;
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    const handleActivity = () => {
      // Throttle to 1s resolution
      const now = Date.now();
      if (now - throttleRef.current < 1000) return;
      throttleRef.current = now;
      resetTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab backgrounded — lock immediately
        clearTimers();
        onLockRef.current?.();
      }
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'] as const;
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start initial timers
    startTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimers();
    };
  }, [enabled, startTimers, clearTimers, resetTimer]);

  return { resetTimer };
}
