"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { getPaymentStatus, pay } from "@base-org/account";

import {
  getCreatorIdentityParts,
  type PaymentAttemptStatus,
  type PublicPaymentLink,
} from "@/lib/payment-links/shared";

import styles from "../../page.module.css";

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
    status: PaymentAttemptStatus,
    payerAddress: string | null,
  ) {
    const response = await fetch(`/api/links/${link.slug}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
        payerAddress,
        status,
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

    await confirmPayment(paymentId, status.status, status.sender ?? null);
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
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Pay Link</p>
          <h1 className={styles.title}>{link.title || "One-time USDC payment"}</h1>
          <p className={styles.subtitle}>
            {link.note || "Pay once with Base Pay. This link closes after a successful payment."}
          </p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.secondaryButton} href="/">
            Back to home
          </Link>
          <Link className={styles.ghostButton} href="/create">
            Create your own payment link
          </Link>
        </div>

        <div className={styles.creatorCard}>
          {link.creatorPfpUrl ? (
            <div
              aria-label={creatorIdentity.primary}
              className={styles.creatorAvatar}
              role="img"
              style={{ backgroundImage: `url(${link.creatorPfpUrl})` }}
            />
          ) : (
            <div className={styles.creatorAvatarFallback}>
              {creatorIdentity.primary.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className={styles.creatorText}>
            <strong className={styles.summaryValue}>
              {creatorIdentity.primary}
            </strong>
            {creatorIdentity.secondary ? (
              <span className={styles.helper}>{creatorIdentity.secondary}</span>
            ) : null}
            {creatorIdentity.address ? (
              <span className={styles.helper}>{creatorIdentity.address}</span>
            ) : null}
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Amount</span>
            <strong className={styles.summaryValue}>
              ${formatAmount(link.amountUsdc)} USDC
            </strong>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Status</span>
            <span className={`${styles.statusPill} ${styles[`status${link.status}`]}`}>
              {STATUS_COPY[link.status]}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Recipient</span>
            <span className={styles.summaryValue} title={link.recipientAddress}>
              {link.recipientAddress}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Expires</span>
            <span className={styles.summaryValue}>{formatDate(link.expiresAt)}</span>
          </div>
        </div>

        {link.payerAddress ? (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Paid by</span>
            <span className={styles.summaryValue} title={link.payerAddress}>
              {link.payerAddress}
            </span>
          </div>
        ) : null}

        <div className={styles.shareRow}>
          <input
            aria-label="Share URL"
            className={styles.input}
            readOnly
            type="text"
            value={shareUrl}
          />
          <button className={styles.secondaryButton} onClick={handleCopyLink} type="button">
            {copyLabel}
          </button>
        </div>

        {paymentMessage ? <p className={styles.helper}>{paymentMessage}</p> : null}
        {error ? <p className={styles.errorText}>{error}</p> : null}

        <div className={styles.actions}>
          {canPay ? (
            <button
              className={styles.primaryButton}
              disabled={isPaying}
              onClick={handlePay}
              type="button"
            >
              {isPaying ? "Processing..." : `Pay $${formatAmount(link.amountUsdc)}`}
            </button>
          ) : null}

          {lastPaymentId && link.status !== "paid" ? (
            <button
              className={styles.secondaryButton}
              disabled={isPaying}
              onClick={handleCheckStatus}
              type="button"
            >
              Check payment status
            </button>
          ) : null}

          <button
            className={styles.ghostButton}
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
            type="button"
          >
            {isRefreshing ? "Refreshing..." : "Refresh link"}
          </button>
        </div>
      </section>
    </main>
  );
}
