'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { prefetchManager } from '@/lib/prefetch'

export function PrefetchManager() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Defer prefetching to not block initial render
    const timer = setTimeout(() => {
      // Start prefetching when app loads
      prefetchManager.startPrefetching()
    }, 100)
    
    // Clear cache on logout
    if (pathname === '/login') {
      prefetchManager.clearCache()
    }
    
    return () => clearTimeout(timer)
  }, [])
  
  // Prefetch data based on current page
  useEffect(() => {
    // If on dashboard, prefetch customer and service data
    if (pathname === '/dashboard' || pathname === '/') {
      setTimeout(() => {
        prefetchManager.prefetchCustomers()
        prefetchManager.prefetchServices()
      }, 1000)
    }
    
    // If on customers page, prefetch services
    if (pathname === '/customers') {
      setTimeout(() => {
        prefetchManager.prefetchServices()
      }, 1000)
    }
    
    // If on services page, prefetch customers
    if (pathname === '/services') {
      setTimeout(() => {
        prefetchManager.prefetchCustomers()
      }, 1000)
    }
  }, [pathname])
  
  return null
}