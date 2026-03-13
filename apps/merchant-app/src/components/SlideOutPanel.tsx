"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { useCompactViewport } from "@/hooks/use-compact-viewport";

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  width?: "narrow" | "medium" | "wide" | "full";
  children: React.ReactNode;
  footer?: React.ReactNode;
  preserveState?: boolean;
  autoFocusFirst?: boolean;
  className?: string;
  overlayClassName?: string;
  showOverlay?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const widthClasses = {
  narrow: "max-w-md",
  medium: "max-w-2xl",
  wide: "max-w-4xl",
  full: "max-w-full",
};

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  width = "medium",
  children,
  footer,
  preserveState = true,
  autoFocusFirst = true,
  className,
  overlayClassName,
  showOverlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  // Whether the container should cover the viewport (true during open + close animation)
  const [isContainerExpanded, setIsContainerExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { isCompact, isKeyboardOpen } = useCompactViewport();

  // Full-screen mode only on inherently compact viewports (landscape POS
  // with very limited vertical space). Keyboard state drives content
  // compaction only — never toggles layout mode mid-interaction.
  const fullScreen = isCompact;

  // Handle opening/closing animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsContainerExpanded(true);
      // Small delay to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      // Collapse the container after the slide-out animation finishes
      // so it no longer blocks touch events on the content beneath.
      const collapseTimer = setTimeout(() => {
        setIsContainerExpanded(false);
      }, 300);
      if (!preserveState) {
        const timer = setTimeout(() => {
          setShouldRender(false);
        }, 300); // Match animation duration
        return () => {
          clearTimeout(timer);
          clearTimeout(collapseTimer);
        };
      }
      return () => clearTimeout(collapseTimer);
    }
  }, [isOpen, preserveState]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Auto-focus first input
  useEffect(() => {
    if (!autoFocusFirst || !isOpen || !contentRef.current) return;

    const timer = setTimeout(() => {
      const firstInput = contentRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])",
      );
      firstInput?.focus();
    }, 350); // After animation completes

    return () => clearTimeout(timer);
  }, [isOpen, autoFocusFirst]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      // Ensure overflow is reset when closed
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  if (!shouldRender && !preserveState) return null;

  return (
    <>
      {/* Overlay — only mount when open/animating to avoid blocking touch scroll */}
      {showOverlay && isContainerExpanded && (
        <div
          className={cn(
            "fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-40",
            isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            overlayClassName,
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Panel Container - prevents shadow overflow.
          In fullscreen mode, only cover viewport while open/animating.
          A persistent fixed inset-0 element blocks touch scrolling on mobile. */}
      <div
        className={cn(
          "fixed z-50 overflow-hidden pointer-events-none",
          fullScreen && isContainerExpanded ? "inset-0" : "top-0 right-0",
        )}
        style={{ height: "var(--visual-viewport-height, 100dvh)" }}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          className={cn(
            "h-full bg-white shadow-xl flex flex-col",
            isVisible ? "pointer-events-auto" : "pointer-events-none",
            "transform transition-transform duration-300 ease-out",
            isVisible ? "translate-x-0" : "translate-x-full",
            fullScreen
              ? "w-full max-w-none"
              : cn(
                  widthClasses[width],
                  "w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw]",
                  width === "narrow" && "max-w-md",
                  width === "medium" && "max-w-2xl",
                  width === "wide" && "max-w-4xl",
                  width === "full" && "max-w-none w-full",
                  className,
                ),
          )}
          style={{ display: shouldRender || preserveState ? "flex" : "none" }}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div
              className={cn(
                "flex items-start justify-between border-b border-gray-200",
                isKeyboardOpen ? "p-3" : "p-6",
              )}
            >
              <div className="flex-1">
                {title && (
                  <h2
                    className={cn(
                      "font-semibold text-gray-900",
                      isKeyboardOpen ? "text-base" : "text-xl",
                    )}
                  >
                    {title}
                  </h2>
                )}
                {!isKeyboardOpen && subtitle && (
                  <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-4 hover:bg-gray-100 rounded-lg"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Content */}
          <div
            ref={contentRef}
            className={cn(
              "flex-1 overflow-y-auto",
              isKeyboardOpen ? "p-3" : "p-6",
            )}
          >
            {children}
          </div>

          {/* Footer — hidden when keyboard is open to maximize space */}
          {footer && !isKeyboardOpen && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Mobile swipe support hook
export function useSwipeToClose(
  isOpen: boolean,
  onClose: () => void,
  threshold = 100,
) {
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      currentXRef.current = e.touches[0].clientX;
      const diff = currentXRef.current - startXRef.current;

      if (diff > 0 && panelRef.current) {
        panelRef.current.style.transform = `translateX(${diff}px)`;
      }
    };

    const handleTouchEnd = () => {
      const diff = currentXRef.current - startXRef.current;

      if (diff > threshold) {
        onClose();
      } else if (panelRef.current) {
        panelRef.current.style.transform = "";
      }
    };

    const panel = panelRef.current;
    if (panel) {
      panel.addEventListener("touchstart", handleTouchStart);
      panel.addEventListener("touchmove", handleTouchMove);
      panel.addEventListener("touchend", handleTouchEnd);

      return () => {
        panel.removeEventListener("touchstart", handleTouchStart);
        panel.removeEventListener("touchmove", handleTouchMove);
        panel.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isOpen, onClose, threshold]);

  return panelRef;
}
