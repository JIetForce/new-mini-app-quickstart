"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { getPaymentStatus, pay } from "@base-org/account";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCreatorIdentityParts,
  type PublicPaymentLink,
} from "@/lib/payment-links/shared";
import { cn } from "@/lib/utils";

interface PaymentLinkClientProps {
  initialLink: PublicPaymentLink;
  initialShareUrl: string;
}

interface LinkApiResponse {
  link: PublicPaymentLink;
  shareUrl: string;
}

const STATUS_COPY: Record<PublicPaymentLink["status"], string> = {
  active: "Ready to pay",
  paid: "Paid",
  expired: "Expired",
  canceled: "Canceled",
};

const STATUS_VARIANTS: Record<
  PublicPaymentLink["status"],
  "default" | "success" | "warning" | "destructive"
> = {
  active: "default",
  paid: "success",
  expired: "warning",
  canceled: "destructive",
};

const PRIMARY_BUTTON_CLASS = "h-11 rounded-full px-5";

const SECONDARY_BUTTON_CLASS = "h-11 rounded-full px-5";

const OUTLINE_BUTTON_CLASS = "h-11 rounded-full px-5";

const SUMMARY_CARD_CLASS =
  "rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4";

function formatAmount(amountUsdc: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(Number(amountUsdc));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "None";
  }

  return new Date(value).toLocaleString();
}

export default function PaymentLinkClient({
  initialLink,
  initialShareUrl,
}: PaymentLinkClientProps) {
  const [link, setLink] = useState(initialLink);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(
    initialLink.paymentId,
  );
  const [isPaying, setIsPaying] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const creatorIdentity = getCreatorIdentityParts(link);

  const canPay = link.status === "active";

  async function refreshLink() {
    const response = await fetch(`/api/links/${link.slug}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as LinkApiResponse & {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || "Unable to refresh payment link.");
    }

    setLink(payload.link);
    setShareUrl(payload.shareUrl);
  }

  async function confirmPayment(
    paymentId: string,
  ) {
    const response = await fetch(`/api/links/${link.slug}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
      }),
    });

    const payload = (await response.json()) as {
      link?: PublicPaymentLink;
      message?: string;
    };

    if (!response.ok || !payload.link) {
      throw new Error(payload.message || "Unable to persist payment status.");
    }

    setLink(payload.link);
  }

  async function checkPayment(paymentId: string) {
    const status = await getPaymentStatus({
      id: paymentId,
      testnet: false,
    });

    await confirmPayment(paymentId);
    setLastPaymentId(paymentId);
    setPaymentMessage(status.reason || status.message);

    if (status.status === "failed" || status.status === "not_found") {
      setError(status.reason || status.message);
      return status.status;
    }

    setError("");
    return status.status;
  }

  async function handlePay() {
    setError("");
    setPaymentMessage("");
    setIsPaying(true);

    try {
      const payment = await pay({
        amount: link.amountUsdc,
        to: link.recipientAddress,
        testnet: false,
      });

      setLastPaymentId(payment.id);
      const status = await checkPayment(payment.id);

      if (status === "completed") {
        setPaymentMessage("Payment completed.");
        return;
      }

      if (status === "pending") {
        setPaymentMessage("Payment submitted. Check status again in a moment.");
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Payment failed to start.",
      );
    } finally {
      setIsPaying(false);
    }
  }

  async function handleCheckStatus() {
    if (!lastPaymentId) {
      return;
    }

    setError("");
    setPaymentMessage("");
    setIsPaying(true);

    try {
      const status = await checkPayment(lastPaymentId);

      if (status === "completed") {
        setPaymentMessage("Payment completed.");
      } else if (status === "pending") {
        setPaymentMessage("Still pending.");
      }
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to check payment status.",
      );
    } finally {
      setIsPaying(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy link"), 1500);
    } catch {
      setCopyLabel("Copy failed");
      window.setTimeout(() => setCopyLabel("Copy link"), 1500);
    }
  }

  return (
    <main className="min-h-screen bg-bg-secondary-subtle px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-border-primary bg-bg-primary p-6 text-text-primary shadow-[0px_12px_40px_0px_var(--color-shadow-lg-1)] sm:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.12em] text-text-brand-secondary uppercase">
            Pay Link
          </p>
          <h1 className="font-display text-display-sm font-medium tracking-[-0.04em] text-text-primary sm:text-display-md">
            {link.title || "One-time USDC payment"}
          </h1>
          <p className="text-md text-text-secondary">
            {link.note || "Pay once with Base Pay. This link closes after a successful payment."}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button asChild className={SECONDARY_BUTTON_CLASS} size="lg" variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild className={OUTLINE_BUTTON_CLASS} size="lg" variant="outline">
            <Link href="/create">Create your own payment link</Link>
          </Button>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
          {link.creatorPfpUrl ? (
            <div
              aria-label={creatorIdentity.primary}
              className="size-12 rounded-full bg-bg-tertiary bg-cover bg-center bg-no-repeat"
              role="img"
              style={{ backgroundImage: `url(${link.creatorPfpUrl})` }}
            />
          ) : (
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-bg-brand-secondary font-semibold text-fg-brand-primary">
              {creatorIdentity.primary.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <strong className="[overflow-wrap:anywhere] text-sm font-semibold text-text-primary">
              {creatorIdentity.primary}
            </strong>
            {creatorIdentity.secondary ? (
              <span className="text-sm leading-6 text-text-tertiary">
                {creatorIdentity.secondary}
              </span>
            ) : null}
            {creatorIdentity.address ? (
              <span className="[overflow-wrap:anywhere] text-sm leading-6 text-text-tertiary">
                {creatorIdentity.address}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className={SUMMARY_CARD_CLASS}>
            <span className="text-sm text-text-tertiary">Amount</span>
            <strong className="mt-1 block [overflow-wrap:anywhere] text-sm font-semibold text-text-primary">
              ${formatAmount(link.amountUsdc)} USDC
            </strong>
          </div>
          <div className={SUMMARY_CARD_CLASS}>
            <span className="text-sm text-text-tertiary">Status</span>
            <Badge className="mt-2" variant={STATUS_VARIANTS[link.status]}>
              {STATUS_COPY[link.status]}
            </Badge>
          </div>
          <div className={SUMMARY_CARD_CLASS}>
            <span className="text-sm text-text-tertiary">Recipient</span>
            <span
              className="mt-1 block [overflow-wrap:anywhere] text-sm font-semibold text-text-primary"
              title={link.recipientAddress}
            >
              {link.recipientAddress}
            </span>
          </div>
          <div className={SUMMARY_CARD_CLASS}>
            <span className="text-sm text-text-tertiary">Expires</span>
            <span className="mt-1 block [overflow-wrap:anywhere] text-sm font-semibold text-text-primary">
              {formatDate(link.expiresAt)}
            </span>
          </div>
        </div>

        {link.payerAddress ? (
          <div className={cn("mb-5", SUMMARY_CARD_CLASS)}>
            <span className="text-sm text-text-tertiary">Paid by</span>
            <span
              className="mt-1 block [overflow-wrap:anywhere] text-sm font-semibold text-text-primary"
              title={link.payerAddress}
            >
              {link.payerAddress}
            </span>
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input aria-label="Share URL" className="h-11" readOnly type="text" value={shareUrl} />
          <Button
            className={SECONDARY_BUTTON_CLASS}
            onClick={handleCopyLink}
            size="lg"
            type="button"
            variant="secondary"
          >
            {copyLabel}
          </Button>
        </div>

        {paymentMessage ? (
          <p className="mb-2 text-sm leading-6 text-text-tertiary">{paymentMessage}</p>
        ) : null}
        {error ? (
          <p className="mb-2 text-sm font-medium text-text-error-primary">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {canPay ? (
            <Button
              className={PRIMARY_BUTTON_CLASS}
              disabled={isPaying}
              onClick={handlePay}
              size="lg"
              type="button"
            >
              {isPaying ? "Processing..." : `Pay $${formatAmount(link.amountUsdc)}`}
            </Button>
          ) : null}

          {lastPaymentId && link.status !== "paid" ? (
            <Button
              className={SECONDARY_BUTTON_CLASS}
              disabled={isPaying}
              onClick={handleCheckStatus}
              size="lg"
              type="button"
              variant="secondary"
            >
              Check payment status
            </Button>
          ) : null}

          <Button
            className={OUTLINE_BUTTON_CLASS}
            disabled={isRefreshing}
            onClick={() => {
              startRefresh(() => {
                void refreshLink().catch((refreshError) => {
                  setError(
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Unable to refresh payment link.",
                  );
                });
              });
            }}
            size="lg"
            type="button"
            variant="outline"
          >
            {isRefreshing ? "Refreshing..." : "Refresh link"}
          </Button>
        </div>
      </section>
    </main>
  );
}
