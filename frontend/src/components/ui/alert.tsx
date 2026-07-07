import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border border-border/60 px-4 py-3 text-sm [&>svg]:absolute [&>svg]:top-3.5 [&>svg]:left-3.5 [&>svg]:size-4 [&>svg+div]:pl-6.5 has-[>svg]:pl-10",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 [&>svg]:text-amber-600 dark:text-amber-400 dark:[&>svg]:text-amber-400",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 [&>svg]:text-emerald-600 dark:text-emerald-400 dark:[&>svg]:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
