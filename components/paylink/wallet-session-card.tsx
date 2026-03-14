"use client";

import { ShieldCheck, Fingerprint, Loader2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getIdentityPresentation } from "@/lib/identity/display";
import { cn } from "@/lib/utils";

type WalletSessionCardState = "loading" | "needs_auth" | "mismatch" | "verified";

interface WalletSessionCardProps {
  connectedAddress?: string | null;
  connectedLabel?: string | null;
  description?: string;
  error?: string | null;
  isAuthenticating?: boolean;
  onConfirm?: () => void;
  sessionAddress?: string | null;
  state: WalletSessionCardState;
}

const COPY_BY_STATE: Record<
  WalletSessionCardState,
  {
    badge: string;
    buttonLabel: string;
    description: string;
    title: string;
  }
> = {
  loading: {
    badge: "Initializing session",
    buttonLabel: "Loading",
    description: "Checking whether a verified wallet session already exists.",
    title: "Confirm Wallet Ownership",
  },
  needs_auth: {
    badge: "Verified session required",
    buttonLabel: "Confirm ownership",
    description:
      "Create a verified session to prove you control this wallet before owner-only actions.",
    title: "Confirm Wallet Ownership",
  },
  mismatch: {
    badge: "Session mismatch",
    buttonLabel: "Confirm ownership again",
    description:
      "The connected wallet does not match the current verified session. Re-confirm ownership to continue.",
    title: "Wallet Session Mismatch",
  },
  verified: {
    badge: "Session active",
    buttonLabel: "Session verified",
    description:
      "This wallet already has a verified session. Owner-only actions can use the verified address.",
    title: "Wallet Ownership Confirmed",
  },
};

export function WalletSessionCard({
  connectedAddress,
  connectedLabel,
  description,
  error,
  isAuthenticating = false,
  onConfirm,
  sessionAddress,
  state,
}: WalletSessionCardProps) {
  const copy = COPY_BY_STATE[state];
  const connectedIdentity = getIdentityPresentation({
    address: connectedAddress ?? null,
    basename: connectedLabel ?? null,
  });
  const sessionIdentity = getIdentityPresentation({
    address: sessionAddress ?? null,
  });
  const canConfirm = state === "needs_auth" || state === "mismatch";

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border-primary bg-bg-secondary/80 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.75)] backdrop-blur-sm">
      <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-bg-brand-solid/50 to-transparent" />
      <div className="absolute inset-x-12 top-4 h-24 rounded-full bg-[var(--indigo-glow)]/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[27px] border border-white/5 bg-bg-secondary/90">
        <div className="relative flex h-44 items-center justify-center overflow-hidden border-b border-border-secondary bg-linear-to-br from-bg-brand-primary/40 via-bg-secondary to-bg-secondary">
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-bg-secondary to-transparent" />
          <div className="absolute inset-0 bg-radial-[circle_at_top] from-bg-brand-solid/20 via-transparent to-transparent" />
          <div className="relative flex size-24 items-center justify-center rounded-full border border-border-brand-alt bg-bg-brand-primary/30 shadow-[0_0_64px_rgba(13,204,242,0.18)]">
            {state === "verified" ? (
              <ShieldCheck className="size-12 text-fg-brand-primary" strokeWidth={1.8} />
            ) : state === "loading" ? (
              <Loader2 className="size-11 animate-spin text-fg-brand-primary" strokeWidth={1.8} />
            ) : (
              <Fingerprint className="size-12 text-fg-brand-primary" strokeWidth={1.8} />
            )}
          </div>
        </div>

        <div className="space-y-6 px-6 py-7">
        <div className="text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-brand-tertiary">
            {copy.badge}
            </p>
            <h2 className="text-[28px] font-bold tracking-tight text-text-primary">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {description ?? copy.description}
            </p>
          </div>

          <div className="rounded-[20px] border border-border-primary bg-bg-primary/60 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-bg-brand-primary text-fg-brand-primary">
                <Wallet className="size-6" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                  Connected Wallet
                </p>
                <p className="text-sm font-semibold text-text-primary">
                  {connectedLabel ?? connectedIdentity.primary}
                </p>
                {connectedIdentity.fullAddress ? (
                  <p className="font-mono text-xs text-text-tertiary [overflow-wrap:anywhere]">
                    {connectedIdentity.fullAddress}
                  </p>
                ) : (
                  <p className="text-xs text-text-tertiary">
                    Wallet address will appear here inside Base App or after connect.
                  </p>
                )}
              </div>
            </div>
          </div>

          {state === "mismatch" && sessionIdentity.fullAddress ? (
            <div className="rounded-[20px] border border-border-primary bg-bg-primary/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Current Session
              </p>
              <p className="mt-1 font-mono text-sm text-text-primary [overflow-wrap:anywhere]">
                {sessionIdentity.fullAddress}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-2 border-y border-border-secondary py-3 text-xs uppercase tracking-[0.18em] text-text-tertiary">
            <ShieldCheck className="size-4 text-fg-brand-primary" strokeWidth={2} />
            <span>Verified SIWE wallet session</span>
          </div>

          {error ? (
            <div className="rounded-[18px] border border-border-error/50 bg-bg-error-primary px-4 py-3 text-sm text-text-error-primary">
              {error}
            </div>
          ) : null}

          {canConfirm ? (
            <Button
              className="h-14 w-full text-base"
              disabled={isAuthenticating}
              onClick={() => onConfirm?.()}
              type="button"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                copy.buttonLabel
              )}
            </Button>
          ) : (
            <div
              className={cn(
                "rounded-[18px] border px-4 py-3 text-center text-sm font-semibold",
                state === "verified"
                  ? "border-border-brand-alt bg-bg-brand-primary text-text-brand-primary"
                  : "border-border-primary bg-bg-primary/70 text-text-tertiary",
              )}
            >
              {state === "loading" ? "Preparing session..." : copy.buttonLabel}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
