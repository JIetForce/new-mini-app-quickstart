"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  children: ReactNode;
  className?: string;
  errorText?: string | null;
  helperText?: ReactNode;
  label: string;
  optional?: boolean;
  required?: boolean;
}

export function FormField({
  children,
  className,
  errorText,
  helperText,
  label,
  optional = false,
  required = false,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-text-secondary">{label}</label>
        {required ? (
          <span className="text-sm font-semibold text-text-brand-primary">*</span>
        ) : optional ? (
          <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            Optional
          </span>
        ) : null}
      </div>
      {children}
      {errorText ? (
        <p className="text-xs leading-5 text-text-error-primary">{errorText}</p>
      ) : helperText ? (
        <p className="text-xs leading-5 text-text-tertiary">{helperText}</p>
      ) : null}
    </div>
  );
}
