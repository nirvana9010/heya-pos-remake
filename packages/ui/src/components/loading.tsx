import * as React from "react"
import { cn } from "../lib/utils"

// Inline spinner for search fields and buttons
export function Spinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <svg
        className="animate-spin h-4 w-4 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

// Success checkmark animation
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-flex h-4 w-4", className)}>
      <svg
        className="absolute inset-0 animate-scale-in"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" className="fill-green-500" />
        <path
          d="M8 12.5L10.5 15L16 9"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-check"
        />
      </svg>
    </div>
  )
}

// Error shake animation wrapper
export function ErrorShake({ 
  children, 
  error,
  className 
}: { 
  children: React.ReactNode
  error?: boolean
  className?: string 
}) {
  return (
    <div className={cn(
      error && "animate-shake",
      className
    )}>
      {children}
    </div>
  )
}

// Loading button with text
export function LoadingButton({
  children,
  loading,
  loadingText = "Loading...",
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingText?: string
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="h-4 w-4" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Pulse overlay for updating items
export function PulseOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  
  return (
    <div className="absolute inset-0 bg-white/50 animate-pulse pointer-events-none" />
  )
}

// Connection status indicator
export function ConnectionStatus({ 
  status = "connected" 
}: { 
  status?: "connected" | "polling" | "disconnected" 
}) {
  const statusConfig = {
    connected: {
      color: "bg-green-500",
      text: "Live",
      pulse: true
    },
    polling: {
      color: "bg-yellow-500",
      text: "Updating",
      pulse: true
    },
    disconnected: {
      color: "bg-red-500",
      text: "Offline",
      pulse: false
    }
  }

  const config = statusConfig[status]

  return (
    <div className="inline-flex items-center gap-2 text-sm text-gray-600">
      <div className="relative">
        <div className={cn(
          "h-2 w-2 rounded-full",
          config.color
        )} />
        {config.pulse && (
          <div className={cn(
            "absolute inset-0 h-2 w-2 rounded-full animate-ping",
            config.color,
            "opacity-75"
          )} />
        )}
      </div>
      <span>{config.text}</span>
    </div>
  )
}

// Last updated timestamp
export function LastUpdated({ timestamp }: { timestamp: Date }) {
  const [relative, setRelative] = React.useState("")

  React.useEffect(() => {
    const updateRelative = () => {
      const now = new Date()
      const diff = now.getTime() - timestamp.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (seconds < 10) {
        setRelative("just now")
      } else if (seconds < 60) {
        setRelative("a few seconds ago")
      } else if (minutes < 60) {
        setRelative(`${minutes} minute${minutes > 1 ? 's' : ''} ago`)
      } else {
        setRelative(`${hours} hour${hours > 1 ? 's' : ''} ago`)
      }
    }

    updateRelative()
    const interval = setInterval(updateRelative, 10000)
    return () => clearInterval(interval)
  }, [timestamp])

  return (
    <span className="text-sm text-gray-500">
      Last updated: {relative}
    </span>
  )
}

// Fade in animation wrapper
export function FadeIn({ 
  children, 
  className,
  delay = 0 
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div 
      className={cn(
        "animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}