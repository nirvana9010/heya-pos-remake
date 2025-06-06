import * as React from "react"
import { cn } from "../lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-100",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-gray-50 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

// Table skeleton for services, customers, etc.
function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b bg-gray-50">
        <div className="flex items-center gap-4 p-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b">
          <div className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-16" : "w-24"
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Card skeleton for dashboard stats
function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  )
}

// Calendar skeleton
function CalendarSkeleton() {
  return (
    <div className="flex h-full">
      {/* Staff headers */}
      <div className="flex border-r">
        <div className="w-24 border-r bg-gray-50 p-4">
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-40 border-r p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
      {/* Time slots */}
      <div className="flex-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex border-b">
            <div className="w-24 border-r bg-gray-50 p-4">
              <Skeleton className="h-4 w-16" />
            </div>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="w-40 border-r p-2">
                {i % 3 === 0 && <Skeleton className="h-20 w-full" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, CalendarSkeleton }