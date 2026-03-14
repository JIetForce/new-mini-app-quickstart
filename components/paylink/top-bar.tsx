"use client";

import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { PayLinkLogoMark } from "@/components/paylink/logo-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BrandTopBar({
  action,
}: {
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-primary bg-bg-primary/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] w-full max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-bg-brand-solid text-text-primary-on-brand shadow-sm">
            <PayLinkLogoMark size={36} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-text-primary">
              Pay Link
            </p>
            <p className="text-xs text-text-tertiary">Base mainnet payments</p>
          </div>
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageTopBar({
  title,
  backHref,
  rightAction,
  subtitle,
  className,
}: {
  title: string;
  backHref?: string;
  rightAction?: ReactNode;
  subtitle?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backHref ?? "/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border-primary bg-bg-primary/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex min-h-[72px] w-full max-w-md items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Button
              aria-label="Go back"
              className="rounded-full"
              onClick={handleBack}
              size="icon"
              type="button"
              variant="ghost"
            >
              <span aria-hidden="true">
                <ArrowLeft className="size-[18px]" />
              </span>
            </Button>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-text-primary">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-xs text-text-tertiary">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {rightAction ?? <div className="size-10 shrink-0" />}
      </div>
    </header>
  );
}
