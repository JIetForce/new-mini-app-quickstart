import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-border-primary bg-bg-primary px-3 py-1 text-base text-text-primary shadow-xs transition-[color,box-shadow] outline-none selection:bg-bg-brand-solid selection:text-text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-placeholder disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-border-brand focus-visible:ring-[3px] focus-visible:ring-focus-ring/50",
        "aria-invalid:border-border-error aria-invalid:ring-focus-ring-error/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
