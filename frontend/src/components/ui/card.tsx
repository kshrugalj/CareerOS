import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "group border-2 border-border bg-paper text-ink hover-lift",
        "hover:border-accent/30 transition-colors duration-200",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative border-b-2 border-border px-5 py-4 overflow-hidden", className)} {...props}>
      {props.children}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
    </div>
  ),
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-display text-sm font-semibold tracking-tight", className)} {...props} />
  ),
)
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-5 py-4", className)} {...props} />
  ),
)
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }
