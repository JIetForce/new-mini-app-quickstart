import Link from "next/link";
import { CircleAlert, Home, Link2 } from "lucide-react";

import { PageTopBar } from "@/components/paylink/top-bar";
import { Button } from "@/components/ui/button";

export default function PaymentLinkNotFound() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <PageTopBar title="Payment Request" backHref="/" />

      <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-[28px] border border-border-primary bg-bg-secondary/90 p-6 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.75)]">
          <div className="mx-auto mb-6 flex size-[72px] items-center justify-center rounded-full bg-bg-brand-primary text-fg-brand-primary">
            <CircleAlert className="size-9" strokeWidth={1.9} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-brand-tertiary">
            Invalid link
          </p>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-text-primary">
            This payment link could not be found
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            The link may be invalid, removed, or never created in this
            environment.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button asChild>
              <Link href="/">
                <Home className="size-4" />
                Home
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/create">
                <Link2 className="size-4" />
                Create link
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
