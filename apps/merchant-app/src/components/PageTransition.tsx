"use client"

import { Suspense, ReactNode } from 'react'
import { Skeleton } from '@heya-pos/ui'

interface PageTransitionProps {
  children: ReactNode
  fallback?: ReactNode
}

export function PageTransition({ children, fallback }: PageTransitionProps) {
  return (
    <Suspense fallback={fallback || <PageSkeleton />}>
      {children}
    </Suspense>
  )
}

export function PageSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      
      <Skeleton className="h-96 w-full" />
    </div>
  )
}