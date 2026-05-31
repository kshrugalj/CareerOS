import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        {
          "bg-ink text-paper": variant === "default",
          "bg-paper-2 text-ink-2": variant === "secondary",
          "border-2 border-border text-ink-2": variant === "outline",
          "bg-success/10 text-success": variant === "success",
          "bg-warning/10 text-warning": variant === "warning",
          "bg-danger/10 text-danger": variant === "danger",
        },
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
