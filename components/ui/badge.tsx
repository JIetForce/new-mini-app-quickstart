import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-bg-brand-primary text-text-brand-secondary [a&]:hover:bg-bg-brand-secondary [a&]:hover:text-text-brand-secondary-hover",
        secondary:
          "bg-bg-secondary text-text-secondary [a&]:hover:bg-bg-secondary-hover",
        success:
          "bg-bg-success-secondary text-text-success-primary [a&]:hover:opacity-90",
        warning:
          "bg-bg-warning-secondary text-text-warning-primary [a&]:hover:opacity-90",
        destructive:
          "bg-bg-error-secondary text-text-error-primary focus-visible:ring-focus-ring-error/20 [a&]:hover:opacity-90",
        outline:
          "border-border-primary text-text-primary [a&]:hover:bg-bg-primary-hover",
        ghost: "[a&]:hover:bg-bg-primary-hover [a&]:hover:text-text-primary",
        link: "text-text-brand-secondary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
