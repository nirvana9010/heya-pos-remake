'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PerformanceMonitor() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Performance monitoring
    if (typeof window !== 'undefined' && window.performance) {
      // Log navigation timing
      const navigationStart = performance.timeOrigin
      const now = performance.now()
      
      
      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // Long task detected - logging removed to reduce console clutter
            }
          }
        })
        
        try {
          observer.observe({ entryTypes: ['longtask'] })
          
          return () => {
            observer.disconnect()
          }
        } catch (e) {
          // Long task observer not supported
        }
      }
    }
  }, [pathname])
  
  return null
}