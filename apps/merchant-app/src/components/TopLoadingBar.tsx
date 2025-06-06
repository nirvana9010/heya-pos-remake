"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function TopLoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)

  // Track route changes
  useEffect(() => {
    let progressInterval: NodeJS.Timeout
    let completionTimeout: NodeJS.Timeout

    const handleStart = () => {
      setLoading(true)
      setProgress(0)
      setTargetProgress(90)
      
      // Smooth progress animation
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const diff = targetProgress - prev
          const step = diff * 0.1
          const next = prev + step
          return next > 89 ? 89 : next
        })
      }, 50)
    }

    const handleComplete = () => {
      clearInterval(progressInterval)
      setTargetProgress(100)
      setProgress(100)
      
      completionTimeout = setTimeout(() => {
        setLoading(false)
        setProgress(0)
        setTargetProgress(0)
      }, 150)
    }

    // Next.js App Router doesn't have router events like Pages Router
    // So we use pathname/searchParams changes as triggers
    handleStart()
    
    // Complete after a short delay
    const completeTimeout = setTimeout(() => {
      handleComplete()
    }, 300)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(completionTimeout)
      clearTimeout(completeTimeout)
    }
  }, [pathname, searchParams])

  // Also track React transitions
  useEffect(() => {
    if (isPending) {
      setLoading(true)
      setProgress(30)
      setTargetProgress(90)
    } else if (loading && !isPending) {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
        setTargetProgress(0)
      }, 150)
    }
  }, [isPending, loading])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent pointer-events-none">
      <div
        className="h-full bg-purple-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(147,51,234,0.7)]"
        style={{ 
          width: `${progress}%`,
          transition: progress === 100 ? 'all 150ms ease-out' : 'all 300ms ease-out'
        }}
      />
    </div>
  )
}