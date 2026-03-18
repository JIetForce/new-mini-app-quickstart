"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Copy, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { useAccount } from "wagmi";

import {
  PublicLinkActiveState,
  PublicLinkInactiveState,
  PublicLinkPaidState,
} from "@/components/paylink/public-link-content";
import { PageTopBar } from "@/components/paylink/top-bar";
import { Button } from "@/components/ui/button";
import { useWalletSession } from "@/lib/auth/useWalletSession";
import {
  buildBaseScanTxUrl,
  getIdentityPresentation,
} from "@/lib/identity/display";
import { useResolvedNames } from "@/lib/identity/useResolvedNames";
import { payWithBuilderCode } from "@/lib/payments/client";
import {
  PAYMENT_LINK_STATUS,
  PAYMENT_ATTEMPT_STATUS,
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

interface ConfirmPaymentResponse {
  attempt?: {
    status: (typeof PAYMENT_ATTEMPT_STATUS)[keyof typeof PAYMENT_ATTEMPT_STATUS];
  };
  link?: PublicPaymentLink;
  message?: string;
}

export default function PaymentLinkClient({
  initialLink,
  initialShareUrl,
}: PaymentLinkClientProps) {
  const { address } = useAccount();
  const { session } = useWalletSession({ prefetchNonce: false });
  const [link, setLink] = useState(initialLink);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const identityAddresses = useMemo(
    () => [link.creatorAddress, link.payerAddress, address, session?.address],
    [address, link.creatorAddress, link.payerAddress, session?.address],
  );
  const { names } = useResolvedNames(identityAddresses);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(
    initialLink.paymentId,
  );
  const [isPaying, setIsPaying] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const creatorIdentity = getIdentityPresentation({
    address: link.creatorAddress,
    basename: names[link.creatorAddress] ?? null,
    displayName: link.creatorDisplayName,
    username: link.creatorUsername,
  });
  const payerIdentity = getIdentityPresentation({
    address: link.payerAddress,
    basename: link.payerAddress ? names[link.payerAddress] ?? null : null,
  });
  const canPay = link.status === PAYMENT_LINK_STATUS.ACTIVE;
  const isCreatorViewer = Boolean(
    (session?.address &&
      session.address.toLowerCase() === link.creatorAddress.toLowerCase()) ||
      (address && address.toLowerCase() === link.creatorAddress.toLowerCase()),
  );
  const isPayerViewer = Boolean(
    address &&
      link.payerAddress &&
      address.toLowerCase() === link.payerAddress.toLowerCase(),
  );
  const paidViewMode =
    link.status !== PAYMENT_LINK_STATUS.PAID
      ? null
      : isPayerViewer
        ? "payer"
        : isCreatorViewer
          ? "creator"
          : "generic";
  const txUrl = buildBaseScanTxUrl(link.paymentId);

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
  ): Promise<
    (typeof PAYMENT_ATTEMPT_STATUS)[keyof typeof PAYMENT_ATTEMPT_STATUS]
  > {
    const response = await fetch(`/api/links/${link.slug}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
      }),
    });

    const payload = (await response.json()) as ConfirmPaymentResponse;

    if (!response.ok || !payload.link || !payload.attempt?.status) {
      throw new Error(payload.message || "Unable to persist payment status.");
    }

    setLink(payload.link);
    return payload.attempt.status;
  }

  async function checkPayment(paymentId: string) {
    const status = await confirmPayment(paymentId);
    setLastPaymentId(paymentId);

    if (
      status === PAYMENT_ATTEMPT_STATUS.FAILED ||
      status === PAYMENT_ATTEMPT_STATUS.NOT_FOUND
    ) {
      setError("Payment could not be verified for this link.");
      return status;
    }

    setError("");
    return status;
  }

  async function handlePay() {
    setError("");
    setPaymentMessage("");
    setIsPaying(true);

    try {
      const payment = await payWithBuilderCode({
        amount: link.amountUsdc,
        to: link.walletAddress,
        testnet: false,
      });

      setLastPaymentId(payment.id);
      const status = await checkPayment(payment.id);

      if (status === PAYMENT_ATTEMPT_STATUS.COMPLETED) {
        setPaymentMessage("Payment completed.");
        return;
      }

      if (status === PAYMENT_ATTEMPT_STATUS.PENDING) {
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

      if (status === PAYMENT_ATTEMPT_STATUS.COMPLETED) {
        setPaymentMessage("Payment completed.");
      } else if (status === PAYMENT_ATTEMPT_STATUS.PENDING) {
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

  async function handleCopy(key: string, value: string) {
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
        title="Payment Request"
        subtitle={
          link.status === PAYMENT_LINK_STATUS.PAID ? "Receipt" : "Base mainnet"
        }
        backHref="/"
        rightAction={
          <div className="flex items-center gap-1">
            <Button
              className="rounded-full"
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
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <RefreshCw
                className={cn("size-4", isRefreshing && "animate-spin")}
                strokeWidth={2}
              />
            </Button>
            <Button
              className="rounded-full"
              onClick={() => void handleCopy("share", shareUrl)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {copiedKey === "share" ? (
                <CheckCircle2 className="size-4" strokeWidth={2} />
              ) : (
                <Copy className="size-4" strokeWidth={2} />
              )}
            </Button>
          </div>
        }
      />

      <div className={cn("mx-auto w-full max-w-md px-4 pb-10 pt-6", canPay && "pb-40")}>
        {paidViewMode ? (
          <PublicLinkPaidState
            copiedKey={copiedKey}
            link={link}
            onCopy={handleCopy}
            paidViewMode={paidViewMode}
            payerIdentity={payerIdentity}
            txUrl={txUrl}
          />
        ) : canPay ? (
          <PublicLinkActiveState
            copiedKey={copiedKey}
            creatorIdentity={creatorIdentity}
            link={link}
            onCopy={handleCopy}
            shareUrl={shareUrl}
          />
        ) : (
          <PublicLinkInactiveState link={link} />
        )}

        {paymentMessage ? (
          <div className="mt-5 rounded-[20px] border border-border-primary bg-bg-brand-primary px-4 py-3 text-sm text-text-secondary">
            {paymentMessage}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-[20px] border border-border-error/40 bg-bg-error-primary px-4 py-3 text-sm text-text-error-primary">
            {error}
          </div>
        ) : null}

        {link.status !== PAYMENT_LINK_STATUS.PAID ? (
          <div className="mt-6 flex gap-2">
            {lastPaymentId ? (
              <Button
                className="flex-1"
                disabled={isPaying}
                onClick={handleCheckStatus}
                type="button"
                variant="secondary"
              >
                Check payment status
              </Button>
            ) : null}

            <Button asChild className="flex-1" variant="outline">
              <Link href="/create">Create your own</Link>
            </Button>
          </div>
        ) : null}
      </div>

      {canPay ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent px-4 pt-12"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
          <div className="mx-auto w-full max-w-md space-y-3">
            <Button
              className="h-[60px] w-full text-base"
              disabled={isPaying}
              onClick={handlePay}
              size="lg"
              type="button"
            >
              <Wallet className="size-[18px]" />
              {isPaying ? "Processing..." : `Pay ${link.amountUsdc} USDC`}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-text-tertiary">
              <ShieldCheck className="size-4 text-fg-brand-primary" strokeWidth={2} />
              <span>On-chain payment on Base</span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
