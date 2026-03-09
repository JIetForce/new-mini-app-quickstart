"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

import { useMiniApp } from "../providers/MiniAppProvider";
import styles from "../page.module.css";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { context } = useMiniApp();
  const [amountUsdc, setAmountUsdc] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [recipientEdited, setRecipientEdited] = useState(false);
  const [showRecipientOverride, setShowRecipientOverride] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (address && !recipientEdited) {
      setRecipientAddress(address);
    }
  }, [address, recipientEdited]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountUsdc,
          creatorAddress: address ?? recipientAddress,
          creatorFid: context?.user?.fid ?? null,
          creatorUsername: context?.user?.username ?? null,
          creatorDisplayName: context?.user?.displayName ?? null,
          creatorPfpUrl: context?.user?.pfpUrl ?? null,
          recipientAddress,
          title,
          note,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      const payload = (await response.json()) as {
        link?: { slug: string };
        message?: string;
      };

      if (!response.ok || !payload.link) {
        throw new Error(payload.message || "Unable to create payment link.");
      }

      router.push(`/r/${payload.link.slug}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create payment link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>Create</p>
          <h1 className={styles.title}>Create a one-time USDC payment link</h1>
          <p className={styles.subtitle}>
            Recipient defaults to the connected Base Account when available. The
            link can be paid once and then locks.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Amount (USDC)</span>
            <input
              className={styles.input}
              inputMode="decimal"
              min="0"
              name="amountUsdc"
              onChange={(event) => setAmountUsdc(event.target.value)}
              placeholder="0.05"
              required
              type="text"
              value={amountUsdc}
            />
          </label>

          {address && !showRecipientOverride ? (
            <div className={styles.field}>
              <span className={styles.label}>Recipient address</span>
              <div className={styles.addressPreview}>
                <code className={styles.inlineCode}>{recipientAddress || address}</code>
                <button
                  className={styles.inlineButton}
                  onClick={() => setShowRecipientOverride(true)}
                  type="button"
                >
                  Edit
                </button>
              </div>
              <span className={styles.helper}>
                Auto-filled from the connected Base Account.
              </span>
            </div>
          ) : (
            <label className={styles.field}>
              <span className={styles.label}>Recipient address</span>
              <input
                className={styles.input}
                name="recipientAddress"
                onChange={(event) => {
                  setRecipientEdited(true);
                  setRecipientAddress(event.target.value);
                }}
                placeholder="0x..."
                required
                spellCheck={false}
                type="text"
                value={recipientAddress}
              />
              <span className={styles.helper}>
                {isConnected
                  ? "Connected wallet detected. Override it only if this payment should go somewhere else."
                  : "Wallet autofill works in Base Preview or the Base app. In a normal browser, enter the recipient manually."}
              </span>
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Title (optional)</span>
            <input
              className={styles.input}
              maxLength={120}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Coffee refund"
              type="text"
              value={title}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Note (optional)</span>
            <textarea
              className={styles.textarea}
              maxLength={500}
              name="note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="USDC on Base only"
              rows={4}
              value={note}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Expiration (optional)</span>
            <input
              className={styles.input}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              name="expiresAt"
              onChange={(event) => setExpiresAt(event.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </label>

          {error ? <p className={styles.errorText}>{error}</p> : null}

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating..." : "Create payment link"}
            </button>
            <Link className={styles.secondaryButton} href="/">
              Home
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
