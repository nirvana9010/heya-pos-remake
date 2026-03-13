"use client";

import { useState, useEffect } from "react";

/** If viewport shrinks by more than this fraction, the keyboard is open */
const KEYBOARD_SHRINK_RATIO = 0.3;

interface CompactViewport {
  /** Touch device in landscape orientation */
  isCompact: boolean;
  /** On-screen keyboard is currently visible */
  isKeyboardOpen: boolean;
  /** Current visual viewport height in px */
  viewportHeight: number;
}

/**
 * Detects compact viewport conditions (landscape touch device) and keyboard.
 *
 * isCompact is true when BOTH:
 *   1. The device has a coarse pointer (touch screen)
 *   2. The viewport is in landscape orientation
 *
 * This correctly identifies POS tablets in landscape without triggering on
 * desktop/laptop monitors that also happen to be wider than they are tall.
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

    // Touch device detection — stable for the lifetime of the page.
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    const update = () => {
      const currentHeight = vv?.height ?? window.innerHeight;
      const shrinkRatio = 1 - currentHeight / initialHeight;

      setState({
        isCompact: isTouchDevice && window.innerWidth > window.innerHeight,
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
