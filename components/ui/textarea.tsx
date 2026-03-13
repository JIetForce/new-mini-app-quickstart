import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-base text-text-primary shadow-xs transition-[color,box-shadow] outline-none placeholder:text-text-placeholder focus-visible:border-border-brand focus-visible:ring-[3px] focus-visible:ring-focus-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-border-error aria-invalid:ring-focus-ring-error/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
