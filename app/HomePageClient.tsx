"use client";

import Link from "next/link";
import { CreditCard, Link2, PlusCircle } from "lucide-react";
import { useAccount } from "wagmi";

import { BottomNav } from "@/components/paylink/bottom-nav";
import { BrandTopBar } from "@/components/paylink/top-bar";
import { Button } from "@/components/ui/button";
import { getIdentityPresentation } from "@/lib/identity/display";
import { useResolvedNames } from "@/lib/identity/useResolvedNames";

const STEPS = [
  {
    title: "Set amount",
    description: "Enter a fixed USDC amount and add optional payment context.",
  },
  {
    title: "Share link",
    description: "Send one public URL. The payment always lands in your Base wallet.",
  },
  {
    title: "Get paid",
    description: "Base Pay completes the payment and the link closes after one success.",
  },
];

export function HomePageClient() {
  const { address } = useAccount();
  const { names } = useResolvedNames([address]);
  const connectedIdentity = getIdentityPresentation({
    address,
    basename: address ? names[address] ?? null : null,
  });

  return (
    <main className="min-h-screen bg-bg-primary">
      <BrandTopBar
        action={
          <Button asChild className="rounded-full" size="icon" variant="secondary">
            <Link href="/my-links" aria-label="Open my payment links">
              <Link2 className="size-[18px]" />
            </Link>
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-md px-6 pb-28 pt-8">
        <section className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-text-brand-tertiary">
            Base mainnet · one-time USDC links
          </p>
          <h1 className="text-[40px] font-bold leading-10 tracking-[-0.05em] text-text-primary">
            One link. One payment.{" "}
            <span className="text-text-brand-primary">Fast.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[22rem] text-lg leading-7 text-text-secondary">
            Create a clean payment link, share it instantly, and close it after
            one verified on-chain payment.
          </p>
        </section>

        <section className="relative mb-10 overflow-hidden rounded-[28px] border border-border-primary bg-[linear-gradient(135deg,rgba(13,204,242,0.18),rgba(19,22,27,1)_52%,rgba(31,35,91,0.55)_100%)] p-6 shadow-[0_28px_80px_-44px_rgba(13,204,242,0.55)]">
          <div className="absolute right-[-64px] top-[-56px] size-44 rounded-full bg-bg-brand-solid/25 blur-3xl" />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-text-brand-primary">
                Secure request flow
              </span>
              <div className="flex size-9 items-center justify-center rounded-2xl bg-bg-brand-primary text-fg-brand-primary">
                <CreditCard className="size-[18px]" strokeWidth={2} />
              </div>
            </div>

            <div>
              <p className="max-w-[14rem] text-[38px] font-bold leading-[0.95] tracking-[-0.05em] text-text-primary">
                Create a one-time USDC request
              </p>
              <p className="mt-3 max-w-[18rem] text-sm leading-6 text-text-secondary">
                Share one link, accept one verified on-chain payment, and close
                the request automatically.
              </p>
              {address ? (
                <p className="mt-4 text-xs text-text-brand-tertiary">
                  Ready as{" "}
                  <span className="font-semibold text-text-primary">
                    {connectedIdentity.primary}
                  </span>
                </p>
              ) : (
                <p className="mt-4 text-xs text-text-brand-tertiary">
                  Best experience inside Base Preview or the Base app.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button asChild className="h-14 w-full text-base">
                <Link href="/create">
                  <PlusCircle className="size-[18px]" />
                  Create link
                </Link>
              </Button>
              <Button asChild className="h-13 w-full" variant="secondary">
                <Link href="/my-links">
                  <Link2 className="size-[18px]" />
                  My links
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-[30px] font-bold tracking-[-0.04em] text-text-primary">
            How it works
          </h2>
          <div className="space-y-5">
            {STEPS.map((step, index) => (
              <article
                key={step.title}
                className="flex items-start gap-4 rounded-[24px] border border-border-primary bg-bg-secondary/70 p-5"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-brand-alt bg-bg-brand-primary text-sm font-bold text-text-brand-primary">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
