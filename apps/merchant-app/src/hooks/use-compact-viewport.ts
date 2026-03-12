"use client";

import { useState, useEffect } from "react";

/** If viewport shrinks by more than this fraction, the keyboard is open */
const KEYBOARD_SHRINK_RATIO = 0.3;

interface CompactViewport {
  /** Landscape orientation — width exceeds height */
  isCompact: boolean;
  /** On-screen keyboard is currently visible */
  isKeyboardOpen: boolean;
  /** Current visual viewport height in px */
  viewportHeight: number;
}

/**
 * Detects landscape orientation and on-screen keyboard state.
 * Uses the VisualViewport API which reflects the actual visible area above
 * the keyboard, unlike window.innerHeight / 100vh which don't change.
 */
export function useCompactViewport(): CompactViewport {
  const [state, setState] = useState<CompactViewport>({
    isCompact: false,
    isKeyboardOpen: false,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    // Capture the initial height before any keyboard opens.
    const initialHeight = Math.max(
      vv?.height ?? window.innerHeight,
      window.innerHeight,
    );

    const update = () => {
      const currentHeight = vv?.height ?? window.innerHeight;
      const shrinkRatio = 1 - currentHeight / initialHeight;

      setState({
        isCompact: window.innerWidth > window.innerHeight,
        isKeyboardOpen: shrinkRatio > KEYBOARD_SHRINK_RATIO,
        viewportHeight: currentHeight,
      });
    };

    update();

    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
      return () => {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      };
    } else {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
  }, []);

  return state;
}
