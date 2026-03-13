"use client";

import React, { useMemo } from "react";
import { useCalendar } from "../CalendarProvider";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@heya-pos/ui";
import type { Booking } from "../types";
import { Check, Heart, Hourglass, X } from "lucide-react";
import { getBookingSourcePresentation } from "../booking-source";
import {
  BookingServiceLabels,
  createServiceLookup,
} from "../BookingServiceLabels";
import { useStaffSession } from "@/contexts/staff-session-context";
import { useIsMobile } from "@/hooks/useIsMobile";

interface WeeklyViewProps {
  onBookingClick: (booking: Booking) => void;
}

export function WeeklyView({ onBookingClick }: WeeklyViewProps) {
  const { state, filteredBookings: allFilteredBookings } = useCalendar();
  const { isLockScreenEnabled, activeStaff: sessionStaff } = useStaffSession();
  const isMobile = useIsMobile();
  const badgeDisplayMode = state.badgeDisplayMode;
  const serviceLookup = useMemo(
    () => createServiceLookup(state.services),
    [state.services],
  );

  const filteredBookings = useMemo(() => {
    if (isLockScreenEnabled && sessionStaff) {
      return allFilteredBookings.filter((b) => b.staffId === sessionStaff.id);
    }
    return allFilteredBookings;
  }, [allFilteredBookings, isLockScreenEnabled, sessionStaff]);

  const weekStart = startOfWeek(state.currentDate);
  const allWeekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // On mobile, show 3 days centered on the current date
  const weekDays = useMemo(() => {
    if (!isMobile) return allWeekDays;
    // Find the index of the current date in the week, show it + neighbors
    const currentIdx = allWeekDays.findIndex((d) => isSameDay(d, state.currentDate));
    const centerIdx = currentIdx >= 0 ? currentIdx : 0;
    const startIdx = Math.max(0, Math.min(centerIdx - 1, 4)); // Keep within 0..4
    return allWeekDays.slice(startIdx, startIdx + 3);
  }, [isMobile, allWeekDays, state.currentDate]);

  // Group bookings by day and sort by time
  const bookingsByDay = useMemo(() => {
    const grouped = new Map<string, Booking[]>();

    filteredBookings.forEach((booking) => {
      const date = parseISO(booking.date);
      const key = format(date, "yyyy-MM-dd");

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(booking);
    });

    // Sort bookings within each day by time, then by staff order
    grouped.forEach((bookings, key) => {
      bookings.sort((a, b) => {
        const timeCompare = a.time.localeCompare(b.time);
        if (timeCompare !== 0) return timeCompare;

        // If same time, sort by staff order from state
        const staffIndexA = state.staff.findIndex((s) => s.id === a.staffId);
        const staffIndexB = state.staff.findIndex((s) => s.id === b.staffId);

        // Unassigned bookings go last
        if (staffIndexA === -1) return 1;
        if (staffIndexB === -1) return -1;

        return staffIndexA - staffIndexB;
      });
    });

    return grouped;
  }, [filteredBookings, state.staff]);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header row */}
      <div
        className={cn("border-b border-gray-200 bg-white overflow-hidden shadow-sm sticky z-30", isMobile ? "h-14" : "h-20")}
        style={{ top: "var(--calendar-sticky-offset, 176px)" }}
      >
        <div className={cn("flex h-full", !isMobile && "min-w-[860px]")}>
          {weekDays.map((day) => {
            const dayBookings = filteredBookings.filter((b) =>
              isSameDay(parseISO(b.date), day),
            );
            const totalRevenue = dayBookings
              .filter((b) => b.status !== "cancelled" && b.status !== "no-show")
              .reduce((sum, b) => sum + b.servicePrice, 0);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 border-r border-gray-200 last:border-r-0 h-full",
                  isMobile ? "px-2 py-1" : "px-3 py-2",
                )}
              >
                <div className="flex items-center justify-between h-full">
                  <div>
                    <div
                      className={cn(
                        "font-medium uppercase tracking-wider",
                        isMobile ? "text-[10px]" : "text-xs",
                        isToday(day) ? "text-teal-600" : "text-gray-500",
                      )}
                    >
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={cn(
                        "font-bold mt-0.5",
                        isMobile ? "text-lg" : "text-2xl",
                        isToday(day) ? "text-teal-600" : "text-gray-900",
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="text-right">
                      <div className={cn("font-semibold text-gray-900", isMobile ? "text-sm" : "text-lg")}>
                        ${totalRevenue}
                      </div>
                      <div className={cn("text-gray-500", isMobile ? "text-[10px]" : "text-xs")}>
                        {dayBookings.length}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable content area */}
      <div
        className="flex-1 overflow-auto min-h-0"
      >
        <div className={cn("flex", !isMobile && "min-w-[860px]")}>
          {/* Days columns with stacked bookings */}
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDay.get(dayKey) || [];

            return (
              <div
                key={day.toISOString()}
                className="flex-1 border-r border-gray-200 last:border-r-0 min-h-full overflow-hidden"
              >
                <div className={cn("space-y-2", isMobile ? "p-1" : "p-2")}>
                  {dayBookings.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No bookings
                    </div>
                  ) : (
                    dayBookings.map((booking) => {
                      let bgColor =
                        state.staff.find((s) => s.id === booking.staffId)
                          ?.color || "#9CA3AF";
                      let opacity = 0.9;
                      let borderWidth = 4;
                      let borderStyle = "solid";
                      let textColor = "text-white";

                      // Check status first
                      if (booking.status === "cancelled") {
                        bgColor = "#FEE2E2"; // Light red background
                        opacity = 0.4;
                        borderWidth = 3;
                        textColor = "text-red-700";
                      } else if (booking.status === "no-show") {
                        opacity = 0.2;
                        borderWidth = 3;
                        textColor = "text-gray-500";
                      } else if (
                        booking.status === "completed" ||
                        booking.completedAt
                      ) {
                        opacity = 0.3;
                        borderWidth = 3;
                        textColor = "text-gray-700";
                      } else if (
                        booking.status === "PENDING" ||
                        booking.status === "pending"
                      ) {
                        // Pending bookings have distinct visual style
                        opacity = 0.65; // Reduced opacity
                        borderWidth = 3;
                        borderStyle = "dashed"; // Dashed border
                      }

                      // Helper to convert hex to rgba
                      const hexToRgba = (hex: string, opacity: number) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                      };

                      const sourcePresentation = getBookingSourcePresentation(
                        booking.source,
                        booking.customerSource,
                      );
                      const SourceIcon = sourcePresentation.icon;
                      const showSourceBadge =
                        sourcePresentation.category !== "unknown";
                      const showPendingStatusBadge =
                        booking.status === "PENDING" ||
                        booking.status === "pending";
                      const showPaidStatusBadge =
                        (booking.paymentStatus === "PAID" ||
                          booking.paymentStatus === "paid") &&
                        booking.status !== "cancelled";
                      const showPreferredIndicator = Boolean(
                        booking.customerRequestedStaff,
                      );
                      const hasStatusBadge =
                        showPendingStatusBadge || showPaidStatusBadge;
                      const requiresBadgeOffset =
                        showSourceBadge ||
                        hasStatusBadge ||
                        showPreferredIndicator;
                      const contentPaddingRight = requiresBadgeOffset ? 80 : 12;
                      const contentPaddingBottom = requiresBadgeOffset
                        ? 26
                        : 12;

                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "cursor-pointer rounded relative overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-md",
                            textColor,
                            booking.status === "cancelled" &&
                              "cancelled-booking",
                            booking.status === "in-progress" &&
                              "animate-[subtlePulse_8s_ease-in-out_infinite]",
                          )}
                          style={{
                            backgroundColor: hexToRgba(bgColor, opacity),
                            backgroundImage:
                              booking.status === "PENDING" ||
                              booking.status === "pending"
                                ? "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))"
                                : undefined,
                            backgroundBlendMode:
                              booking.status === "PENDING" ||
                              booking.status === "pending"
                                ? ("overlay" as any)
                                : undefined,
                            borderLeft: `${borderWidth}px ${borderStyle} ${bgColor}`,
                            paddingLeft: `${borderWidth + 8}px`,
                            paddingRight: `${contentPaddingRight}px`,
                            paddingTop: "8px",
                            paddingBottom: `${contentPaddingBottom}px`,
                          }}
                          onClick={() => onBookingClick(booking)}
                        >
                          {/* Cancelled indicator */}
                          {booking.status === "cancelled" && (
                            <div className="flex items-center gap-1 mb-1">
                              <X
                                className="w-3 h-3 text-red-600"
                                strokeWidth={3}
                              />
                              <span className="text-[10px] font-bold text-red-600 uppercase">
                                Cancelled
                              </span>
                            </div>
                          )}

                          {/* Time and duration on its own row */}
                          {booking.status !== "cancelled" && (
                            <div className="text-xs font-medium opacity-75 mb-1">
                              {format(
                                parseISO(`2000-01-01T${booking.time}`),
                                "h:mm a",
                              )}{" "}
                              • {booking.duration}m
                            </div>
                          )}

                          {/* Customer name */}
                          <div className="font-semibold truncate text-xs sm:text-sm">
                            {booking.customerName
                              ?.replace(
                                /Walk-in.*\d{1,2}-\d{1,2}(AM|PM)$/i,
                                "Walk-in",
                              )
                              .replace(
                                /Walk-in \d{2}-\w+-\d{1,2}-\d{2}-\w+/i,
                                "Walk-in",
                              )}
                          </div>

                          {/* Service name */}
                          <BookingServiceLabels
                            booking={booking}
                            lookup={serviceLookup}
                            className="mt-1"
                            textClassName="text-[11px] opacity-90"
                            dotClassName="h-2 w-2"
                          />

                          {/* Staff name */}
                          <div className="text-xs mt-1 opacity-75">
                            {booking.staffId
                              ? state.staff.find(
                                  (s) => s.id === booking.staffId,
                                )?.name || "Unknown Staff"
                              : "Unassigned"}
                          </div>

                          {/* Source badge + status indicators */}
                          {(showSourceBadge ||
                            hasStatusBadge ||
                            showPreferredIndicator) &&
                            (() => {
                              const mode = badgeDisplayMode;
                              const badgeItems: React.ReactNode[] = [];

                              if (showPreferredIndicator) {
                                badgeItems.push(
                                  mode === "icon" ? (
                                    <span
                                      key="preferred"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                                    >
                                      <Heart
                                        className="h-3 w-3"
                                        strokeWidth={2.2}
                                        fill="currentColor"
                                      />
                                    </span>
                                  ) : (
                                    <span
                                      key="preferred"
                                      className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
                                    >
                                      <Heart
                                        className="h-3 w-3"
                                        strokeWidth={2.2}
                                        fill="currentColor"
                                      />
                                      Preferred
                                    </span>
                                  ),
                                );
                              }

                              if (showSourceBadge) {
                                badgeItems.push(
                                  mode === "icon" ? (
                                    <span
                                      key="source"
                                      className={cn(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-full shadow",
                                        sourcePresentation.indicatorWrapperClassName,
                                      )}
                                    >
                                      <SourceIcon
                                        className={cn(
                                          "h-3 w-3",
                                          sourcePresentation.iconClassName,
                                        )}
                                      />
                                    </span>
                                  ) : (
                                    <span
                                      key="source"
                                      className={cn(
                                        sourcePresentation.badgeClassName,
                                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow",
                                      )}
                                    >
                                      <SourceIcon
                                        className={cn(
                                          "h-3 w-3",
                                          sourcePresentation.iconClassName,
                                        )}
                                      />
                                      {sourcePresentation.label}
                                    </span>
                                  ),
                                );
                              }

                              if (showPendingStatusBadge) {
                                badgeItems.push(
                                  mode === "icon" ? (
                                    <span
                                      key="pending"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/90 text-amber-950 shadow"
                                    >
                                      <Hourglass className="h-3 w-3" />
                                    </span>
                                  ) : (
                                    <span
                                      key="pending"
                                      className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow"
                                    >
                                      <Hourglass className="h-3 w-3" />
                                      Pending
                                    </span>
                                  ),
                                );
                              }

                              if (showPaidStatusBadge) {
                                badgeItems.push(
                                  mode === "icon" ? (
                                    <span
                                      key="paid"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-emerald-950 shadow"
                                    >
                                      <Check
                                        className="h-3 w-3"
                                        strokeWidth={3}
                                      />
                                    </span>
                                  ) : (
                                    <span
                                      key="paid"
                                      className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 shadow"
                                    >
                                      <Check
                                        className="h-3 w-3"
                                        strokeWidth={3}
                                      />
                                      Paid
                                    </span>
                                  ),
                                );
                              }

                              if (!badgeItems.length) {
                                return null;
                              }

                              return (
                                <div className="pointer-events-none absolute bottom-2 right-2 flex flex-row-reverse flex-wrap items-center gap-1">
                                  {badgeItems}
                                </div>
                              );
                            })()}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
