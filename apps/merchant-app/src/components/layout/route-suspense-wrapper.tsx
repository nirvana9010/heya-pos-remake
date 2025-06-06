'use client'

import { Suspense } from 'react'
import { Skeleton } from '@heya-pos/ui'

interface RouteSuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Default loading component for routes
function DefaultRouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function RouteSuspenseWrapper({ children, fallback }: RouteSuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback || <DefaultRouteLoading />}>
      {children}
    </Suspense>
  )
}