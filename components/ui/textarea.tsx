import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-[24px] border border-border-primary bg-bg-secondary/80 px-4 py-3 text-base text-text-primary shadow-xs transition-all outline-none placeholder:text-text-placeholder focus-visible:border-border-brand focus-visible:ring-2 focus-visible:ring-focus-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-border-error aria-invalid:ring-focus-ring-error/20 md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
