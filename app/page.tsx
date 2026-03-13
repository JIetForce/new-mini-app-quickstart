import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-secondary-subtle px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-border-primary bg-bg-primary p-6 text-text-primary shadow-[0px_12px_40px_0px_var(--color-shadow-lg-1)] sm:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.12em] text-text-brand-secondary uppercase">
            Pay Link
          </p>
          <h1 className="font-display text-display-sm font-medium tracking-[-0.04em] text-text-primary sm:text-display-md">
            Create a one-time USDC payment link on Base
          </h1>
          <p className="text-md text-text-secondary">
            Generate a fixed-amount link, share it, and let the next person pay
            with Base Pay on mainnet. One successful payment closes the link.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
            <span className="text-sm text-text-tertiary">Asset</span>
            <strong className="mt-1 block text-sm font-semibold text-text-primary">
              USDC on Base
            </strong>
          </div>
          <div className="rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
            <span className="text-sm text-text-tertiary">Flow</span>
            <strong className="mt-1 block text-sm font-semibold text-text-primary">
              Create, share, pay once
            </strong>
          </div>
          <div className="rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
            <span className="text-sm text-text-tertiary">Settlement</span>
            <strong className="mt-1 block text-sm font-semibold text-text-primary">
              Mainnet only
            </strong>
          </div>
          <div className="rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
            <span className="text-sm text-text-tertiary">States</span>
            <strong className="mt-1 block text-sm font-semibold text-text-primary">
              active, paid, expired, canceled
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="h-11 rounded-full px-5" size="lg">
            <Link href="/create">Create payment link</Link>
          </Button>
          <Button asChild className="h-11 rounded-full px-5" size="lg" variant="secondary">
            <Link href="/my-links">My links</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
