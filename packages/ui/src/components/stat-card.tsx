import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown } from "lucide-react"

import { cn } from "../lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

const statCardVariants = cva(
  "flex items-center text-sm font-medium",
  {
    variants: {
      trend: {
        up: "text-green-600 dark:text-green-400",
        down: "text-red-600 dark:text-red-400",
        neutral: "text-muted-foreground",
      },
    },
    defaultVariants: {
      trend: "neutral",
    },
  }
)

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  trendLabel?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      title,
      value,
      description,
      icon,
      trend = "neutral",
      trendValue,
      trendLabel,
      ...props
    },
    ref
  ) => {
    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon && (
            <div className="h-4 w-4 text-muted-foreground">{icon}</div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {(description || trendValue) && (
            <div className="flex items-center justify-between mt-2">
              {description && (
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              )}
              {trendValue && (
                <div className={cn(statCardVariants({ trend }))}>
                  {trend === "up" && <TrendingUp className="mr-1 h-3 w-3" />}
                  {trend === "down" && <TrendingDown className="mr-1 h-3 w-3" />}
                  <span className="text-xs">{trendValue}</span>
                  {trendLabel && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {trendLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

StatCard.displayName = "StatCard"

export { StatCard, statCardVariants }