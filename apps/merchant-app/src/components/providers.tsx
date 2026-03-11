"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthGuard } from "./AuthGuard";
import { PrefetchManager } from "./PrefetchManager";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { TimezoneProvider } from "@/contexts/timezone-context";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { QueryProvider } from "@/lib/query/query-provider";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { BookingProvider } from "@/contexts/booking-context";
import { StaffSessionProvider } from "@/contexts/staff-session-context";
import { ClearCorruptedAuth } from "./ClearCorruptedAuth";
import { TyroSDKLoader } from "./TyroSDKLoader";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Track visual viewport height for on-screen keyboard awareness.
  // Sets --visual-viewport-height CSS variable that slideout panels use
  // so they shrink above the keyboard instead of being covered by it.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        `${vv.height}px`,
      );
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  const isAuthPage = pathname === "/login";
  const isTestPage = pathname.startsWith("/test");
  const needsNotifications = pathname === "/test-notifications";

  return (
    <QueryProvider>
      <ClearCorruptedAuth />
      <TyroSDKLoader />
      <AuthProvider>
        {/* Only wrap protected routes in AuthGuard and layout */}
        {isAuthPage ? (
          children
        ) : isTestPage ? (
          // Test pages may need notifications context
          needsNotifications ? (
            <NotificationsProvider>{children}</NotificationsProvider>
          ) : (
            children
          )
        ) : (
          <AuthGuard>
            <StaffSessionProvider>
              <TimezoneProvider>
                <NotificationsProvider>
                  <BookingProvider>
                    <PerformanceMonitor />
                    <PrefetchManager />
                    {children}
                  </BookingProvider>
                </NotificationsProvider>
              </TimezoneProvider>
            </StaffSessionProvider>
          </AuthGuard>
        )}
      </AuthProvider>
    </QueryProvider>
  );
}
