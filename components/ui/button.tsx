import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[20px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-focus-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-bg-brand-solid text-text-primary-on-brand font-bold hover:bg-bg-brand-solid-hover active:scale-[0.985]",
        outline:
          "border-border-primary bg-bg-secondary/70 text-text-brand-primary hover:bg-bg-brand-primary",
        secondary:
          "border-border-primary bg-bg-secondary text-text-primary hover:bg-bg-primary-hover",
        ghost:
          "text-text-tertiary hover:bg-bg-brand-primary hover:text-text-brand-primary",
        destructive:
          "bg-bg-error-solid text-text-white hover:bg-bg-error-solid-hover focus-visible:ring-focus-ring-error/20",
        link: "rounded-none px-0 text-text-brand-primary underline-offset-4 hover:text-text-brand-secondary-hover hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4",
        xs: "h-7 gap-1 rounded-[14px] px-2.5 text-xs",
        sm: "h-9 gap-1.5 rounded-[16px] px-3.5 text-[0.8rem]",
        lg: "h-12 gap-2 px-5 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-[14px]",
        "icon-sm": "size-9 rounded-[16px]",
        "icon-lg": "size-11 rounded-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
