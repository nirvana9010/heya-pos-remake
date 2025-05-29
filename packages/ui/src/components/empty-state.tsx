import * as React from "react"
import { cn } from "../lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <div className="h-6 w-6 text-muted-foreground">{icon}</div>
          </div>
        )}
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    )
  }
)

EmptyState.displayName = "EmptyState"

export { EmptyState }