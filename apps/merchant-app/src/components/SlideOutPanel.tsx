"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";

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
  full: "max-w-full"
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
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle opening/closing animations
  useEffect(() => {
    console.log('[SlideOutPanel] isOpen changed to:', isOpen, 'preserveState:', preserveState);
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        setIsVisible(true);
        console.log('[SlideOutPanel] Panel opening - isVisible set to true');
      });
    } else {
      setIsVisible(false);
      console.log('[SlideOutPanel] Panel closing - isVisible set to false');
      if (!preserveState) {
        const timer = setTimeout(() => {
          setShouldRender(false);
          console.log('[SlideOutPanel] shouldRender set to false after animation');
        }, 300); // Match animation duration
        return () => clearTimeout(timer);
      }
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
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
      );
      firstInput?.focus();
    }, 350); // After animation completes

    return () => clearTimeout(timer);
  }, [isOpen, autoFocusFirst]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow || '';
      console.log('[SlideOutPanel] Setting body overflow to hidden, original was:', originalOverflow);
      document.body.style.overflow = "hidden";
      
      return () => {
        console.log('[SlideOutPanel] Restoring body overflow to:', originalOverflow);
        document.body.style.overflow = originalOverflow;
      };
    } else {
      // Ensure overflow is reset when closed
      console.log('[SlideOutPanel] Panel closed, ensuring overflow is reset');
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  if (!shouldRender && !preserveState) return null;

  return (
    <>
      {/* Overlay */}
      {showOverlay && (
        <div
          className={cn(
            "fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-40",
            isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            overlayClassName
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col",
          "transform transition-transform duration-300 ease-out",
          isVisible ? "translate-x-0" : "translate-x-full pointer-events-none",
          widthClasses[width],
          "w-[90%] sm:w-[80%] md:w-[70%] lg:w-[60%] xl:w-[50%]",
          width === "narrow" && "max-w-md",
          width === "medium" && "max-w-2xl",
          width === "wide" && "max-w-4xl",
          width === "full" && "max-w-none w-full",
          className
        )}
        style={{ display: shouldRender || preserveState ? "flex" : "none" }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {subtitle && (
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
          className="flex-1 overflow-y-auto p-6"
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// Mobile swipe support hook
export function useSwipeToClose(
  isOpen: boolean,
  onClose: () => void,
  threshold = 100
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