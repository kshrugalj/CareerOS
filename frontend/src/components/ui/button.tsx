import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline" | "link"
  size?: "sm" | "md" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-40",
          {
            "rounded-full bg-ink text-paper hover:bg-ink-2 hover:shadow-md active:scale-[0.97]": variant === "default",
            "rounded-full bg-paper-2 text-ink hover:bg-paper-3 active:scale-[0.97]": variant === "secondary",
            "text-ink-3 hover:text-ink hover:bg-paper-2 active:scale-[0.97]": variant === "ghost",
            "rounded-full border-2 border-border bg-paper text-ink hover:border-ink hover:bg-paper-2 hover:shadow-md active:scale-[0.97]": variant === "outline",
            "underline-offset-4 hover:underline text-ink": variant === "link",
          },
          {
            "h-8 px-4 text-xs": size === "sm",
            "h-10 px-5 text-sm": size === "md",
            "h-12 px-7 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button }
