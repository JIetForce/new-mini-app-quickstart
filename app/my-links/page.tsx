"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletSession } from "@/lib/auth/useWalletSession";
import {
  getCreatorIdentityParts,
  PaymentLinkStatus,
  PublicPaymentLink,
} from "@/lib/payment-links/shared";

type StatusFilter = "all" | PaymentLinkStatus;

interface MyLinksResponse {
  links: PublicPaymentLink[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  status: PaymentLinkStatus | null;
}

const STATUS_VARIANTS: Record<
  PaymentLinkStatus,
  "default" | "success" | "warning" | "destructive"
> = {
  active: "default",
  paid: "success",
  expired: "warning",
  canceled: "destructive",
};

function formatAmount(amountUsdc: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(Number(amountUsdc));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export default function MyLinksPage() {
  const {
    address,
    authenticate,
    error: authError,
    isAuthenticating,
    isLoading: isSessionLoading,
    session,
    sessionMismatch,
  } = useWalletSession();
  const [links, setLinks] = useState<PublicPaymentLink[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!session || sessionMismatch) {
      setLinks([]);
      setHasNextPage(false);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(page),
      pageSize: "10",
    });

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    void fetch(`/api/my-links?${params.toString()}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as MyLinksResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load your links.");
        }

        setLinks(payload.links);
        setHasNextPage(payload.hasNextPage);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your links.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [page, session, sessionMismatch, statusFilter]);

  async function handleCopyLink(slug: string) {
    try {
      const shareUrl = new URL(`/r/${slug}`, window.location.origin).toString();
      await navigator.clipboard.writeText(shareUrl);
      setCopiedSlug(slug);
      window.setTimeout(() => {
        setCopiedSlug((currentSlug) => (currentSlug === slug ? null : currentSlug));
      }, 1500);
    } catch {
      setCopiedSlug(null);
    }
  }

  return (
    <main className="min-h-screen bg-bg-secondary-subtle px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-border-primary bg-bg-primary p-6 text-text-primary shadow-[0px_12px_40px_0px_var(--color-shadow-lg-1)] sm:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.12em] text-text-brand-secondary uppercase">
            My links
          </p>
          <h1 className="font-display text-display-sm font-medium tracking-[-0.04em] text-text-primary sm:text-display-md">
            Your created payment links
          </h1>
          <p className="text-md text-text-secondary">
            Owner-only access is derived from your verified wallet session. Test
            Base Account behavior from Base Preview or the Base app using a public
            HTTPS URL.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full max-w-xs flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">Status</span>
            <Select
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              value={statusFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="h-11 rounded-full px-5" size="lg" variant="secondary">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild className="h-11 rounded-full px-5" size="lg">
              <Link href="/create">Create link</Link>
            </Button>
          </div>
        </div>

        {isSessionLoading ? (
          <p className="mb-4 text-sm leading-6 text-text-tertiary">
            Checking wallet session...
          </p>
        ) : sessionMismatch ? (
          <div className="mb-4 rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
            <p className="text-sm leading-6 text-text-secondary">
              Connected wallet and signed-in wallet do not match. Re-authenticate
              to load your links.
            </p>
            <div className="mt-2 flex flex-col gap-1 text-sm text-text-tertiary">
              <span className="[overflow-wrap:anywhere]">Connected: {address}</span>
              <span className="[overflow-wrap:anywhere]">Session: {session?.address}</span>
            </div>
            <Button
              className="mt-3 h-11 rounded-full px-5"
              disabled={isAuthenticating}
              onClick={() => void authenticate()}
              size="lg"
              type="button"
            >
              {isAuthenticating ? "Signing in..." : "Sign in again"}
            </Button>
          </div>
        ) : !session ? (
          <div className="mb-4 rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
            <p className="text-sm leading-6 text-text-secondary">
              Sign in with your wallet to load your payment links.
            </p>
            <Button
              className="mt-3 h-11 rounded-full px-5"
              disabled={isAuthenticating}
              onClick={() => void authenticate()}
              size="lg"
              type="button"
            >
              {isAuthenticating ? "Signing in..." : "Sign in with wallet"}
            </Button>
          </div>
        ) : (
          <p className="mb-4 text-sm leading-6 text-text-tertiary">
            Signed in as <span className="[overflow-wrap:anywhere]">{session.address}</span>
          </p>
        )}

        {authError ? (
          <p className="mb-4 text-sm font-medium text-text-error-primary">
            {authError}
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 text-sm font-medium text-text-error-primary">
            {error}
          </p>
        ) : null}

        <div className="mb-5 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-sm leading-6 text-text-tertiary">Loading...</p>
          ) : null}

          {!isLoading && session && !sessionMismatch && links.length === 0 ? (
            <p className="text-sm leading-6 text-text-tertiary">
              No links found for this wallet yet.
            </p>
          ) : null}

          {links.map((link) => {
            const creatorIdentity = getCreatorIdentityParts(link);

            return (
              <div
                className="flex flex-col gap-4 rounded-2xl border border-border-primary bg-bg-primary p-4 shadow-[0px_1px_2px_0px_var(--color-shadow-xs)]"
                key={link.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <strong className="[overflow-wrap:anywhere] text-sm font-semibold text-text-primary">
                    {link.title || `${formatAmount(link.amountUsdc)} USDC`}
                  </strong>
                  <Badge variant={STATUS_VARIANTS[link.status]}>{link.status}</Badge>
                </div>

                <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                  <span>Amount: ${formatAmount(link.amountUsdc)} USDC</span>
                  <span title={link.creatorAddress}>
                    Creator: You · {creatorIdentity.primary}
                  </span>
                  <span className="[overflow-wrap:anywhere]" title={link.recipientAddress}>
                    Recipient: {link.recipientAddress}
                  </span>
                  <span>Created: {formatDate(link.createdAt)}</span>
                  <span>Paid: {formatDate(link.paidAt)}</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="h-11 rounded-full px-5" size="lg" variant="secondary">
                    <Link href={`/r/${link.slug}`}>Open link</Link>
                  </Button>
                  <Button
                    className="h-11 rounded-full px-5"
                    onClick={() => void handleCopyLink(link.slug)}
                    size="lg"
                    type="button"
                    variant="outline"
                  >
                    {copiedSlug === link.slug ? "Copied" : "Copy link"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {session && !sessionMismatch ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-11 rounded-full px-5"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              size="lg"
              type="button"
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm leading-6 text-text-tertiary">Page {page}</span>
            <Button
              className="h-11 rounded-full px-5"
              disabled={!hasNextPage || isLoading}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              size="lg"
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
