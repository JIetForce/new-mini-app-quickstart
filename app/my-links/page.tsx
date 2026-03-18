"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { BottomNav } from "@/components/paylink/bottom-nav";
import { MyLinkCard } from "@/components/paylink/my-link-card";
import { PageTopBar } from "@/components/paylink/top-bar";
import { WalletSessionCard } from "@/components/paylink/wallet-session-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletSession } from "@/lib/auth/useWalletSession";
import { getIdentityPresentation } from "@/lib/identity/display";
import { useResolvedNames } from "@/lib/identity/useResolvedNames";
import {
  PAYMENT_LINK_STATUS,
  type PaymentLinkStatus,
  type PublicPaymentLink,
} from "@/lib/payment-links/shared";

type StatusFilter = "all" | PaymentLinkStatus;

interface MyLinksResponse {
  links: PublicPaymentLink[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  status: PaymentLinkStatus | null;
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: PAYMENT_LINK_STATUS.ACTIVE, label: "Active" },
  { value: PAYMENT_LINK_STATUS.PAID, label: "Paid" },
  { value: PAYMENT_LINK_STATUS.EXPIRED, label: "Expired" },
  { value: PAYMENT_LINK_STATUS.CANCELED, label: "Canceled" },
];

function formatAmount(amountUsdc: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(amountUsdc);
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const identityAddresses = useMemo(
    () => [session?.address, ...links.map((link) => link.payerAddress)],
    [links, session?.address],
  );
  const { names } = useResolvedNames(identityAddresses);

  useEffect(() => {
    if (!session || sessionMismatch) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      try {
        const response = await fetch(`/api/my-links?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as MyLinksResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load your links.");
        }

        if (cancelled) {
          return;
        }

        setLinks(payload.links);
        setHasNextPage(payload.hasNextPage);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your links.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, session, sessionMismatch, statusFilter]);

  const stats = useMemo(() => {
    const paidLinks = links.filter(
      (link) => link.status === PAYMENT_LINK_STATUS.PAID,
    );
    const activeLinks = links.filter(
      (link) => link.status === PAYMENT_LINK_STATUS.ACTIVE,
    );
    const paidTotal = paidLinks.reduce(
      (sum, link) => sum + Number(link.amountUsdc),
      0,
    );
    const openTotal = activeLinks.reduce(
      (sum, link) => sum + Number(link.amountUsdc),
      0,
    );

    return {
      openTotal,
      paidTotal,
    };
  }, [links]);
  const ownerIdentity = getIdentityPresentation({
    address: session?.address ?? address,
    basename: names[session?.address ?? ""] ?? names[address ?? ""] ?? null,
  });
  const sessionState = isSessionLoading
    ? "loading"
    : sessionMismatch
      ? "mismatch"
      : session
        ? "verified"
        : "needs_auth";
  const visibleLinks = session && !sessionMismatch ? links : [];
  const visibleHasNextPage = session && !sessionMismatch ? hasNextPage : false;
  const visibleError = session && !sessionMismatch ? error : "";

  async function handleCopyLink(slug: string) {
    try {
      const shareUrl = new URL(`/r/${slug}`, window.location.origin).toString();
      await navigator.clipboard.writeText(shareUrl);
      setCopiedKey(`link:${slug}`);
      window.setTimeout(() => {
        setCopiedKey((currentKey) =>
          currentKey === `link:${slug}` ? null : currentKey,
        );
      }, 1500);
    } catch {
      setCopiedKey(null);
    }
  }

  async function handleCopyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((currentKey) => (currentKey === key ? null : currentKey));
      }, 1500);
    } catch {
      setCopiedKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      <PageTopBar
        title="My Pay Links"
        backHref="/"
        rightAction={
          <Button
            asChild
            className="rounded-full"
            size="icon"
            variant="default"
          >
            <Link href="/create" aria-label="Create a new payment link">
              <Plus className="size-[18px]" />
            </Link>
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        {!session || sessionMismatch || isSessionLoading ? (
          <div className="mb-6">
            <WalletSessionCard
              connectedAddress={address}
              connectedLabel={ownerIdentity.primary}
              description="Your link history is owner-scoped. Confirm wallet ownership to load links for this session wallet only."
              error={authError}
              isAuthenticating={isAuthenticating}
              onConfirm={() => void authenticate()}
              sessionAddress={session?.address}
              state={sessionState}
            />
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-border-primary bg-bg-secondary/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Paid on page
              </p>
              <p className="mt-2 text-2xl font-bold text-text-brand-primary">
                ${formatAmount(stats.paidTotal)}
              </p>
            </div>
            <div className="rounded-[24px] border border-border-primary bg-bg-secondary/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Open on page
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                ${formatAmount(stats.openTotal)}
              </p>
            </div>
          </div>
        )}

        {visibleError ? (
          <div className="mb-5 rounded-[20px] border border-border-error/40 bg-bg-error-primary px-4 py-3 text-sm text-text-error-primary">
            {visibleError}
          </div>
        ) : null}

        <div className="mb-5">
          <Select
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-[24px] border border-border-primary bg-bg-secondary/60 px-5 py-10 text-center text-sm text-text-tertiary">
              Loading your links...
            </div>
          ) : null}

          {!isLoading && session && !sessionMismatch && visibleLinks.length === 0 ? (
            <div className="rounded-[24px] border border-border-primary bg-bg-secondary/60 px-5 py-10 text-center">
              <p className="text-base font-semibold text-text-primary">
                No links yet
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Create your first payment link and it will appear here.
              </p>
              <Button asChild className="mt-5">
                <Link href="/create">Create a link</Link>
              </Button>
            </div>
          ) : null}

          {visibleLinks.map((link) => {
            const payerIdentity = getIdentityPresentation({
              address: link.payerAddress,
              basename: link.payerAddress
                ? (names[link.payerAddress] ?? null)
                : null,
            });

            return (
              <MyLinkCard
                copiedKey={copiedKey}
                key={link.id}
                link={link}
                onCopyLink={handleCopyLink}
                onCopyValue={handleCopyValue}
                payerLabel={link.payerAddress ? payerIdentity.primary : null}
              />
            );
          })}
        </div>

        {session && !sessionMismatch ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              disabled={page === 1 || isLoading}
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              type="button"
              variant="secondary"
            >
              Previous
            </Button>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
              Page {page}
            </span>
            <Button
              disabled={!visibleHasNextPage || isLoading}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              type="button"
              variant="secondary"
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <BottomNav />
    </main>
  );
}
