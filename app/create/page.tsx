"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWalletSession } from "@/lib/auth/useWalletSession";

import { useMiniApp } from "../providers/MiniAppProvider";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { context } = useMiniApp();
  const {
    authenticate,
    error: authError,
    isAuthenticating,
    isLoading: isSessionLoading,
    session,
    sessionMismatch,
  } = useWalletSession();
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

  const creatorFid =
    typeof context?.user?.fid === "number" && context.user.fid > 0
      ? context.user.fid
      : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!session || sessionMismatch) {
      setError("Sign in with your wallet before creating a payment link.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountUsdc,
          creatorFid,
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
    <main className="min-h-screen bg-bg-secondary-subtle px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-border-primary bg-bg-primary p-6 text-text-primary shadow-[0px_12px_40px_0px_var(--color-shadow-lg-1)] sm:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-xs font-bold tracking-[0.12em] text-text-brand-secondary uppercase">
            Create
          </p>
          <h1 className="font-display text-display-sm font-medium tracking-[-0.04em] text-text-primary sm:text-display-md">
            Create a one-time USDC payment link
          </h1>
          <p className="text-md text-text-secondary">
            Recipient defaults to the connected Base Account when available. The
            link can be paid once and then locks.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4">
          {isSessionLoading ? (
            <p className="text-sm leading-6 text-text-tertiary">
              Checking wallet session...
            </p>
          ) : sessionMismatch ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-6 text-text-secondary">
                Connected Base Account and ownership session do not match.
                Confirm ownership again before creating links.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-text-tertiary">
                <span className="[overflow-wrap:anywhere]">
                  Connected: {address}
                </span>
                <span className="[overflow-wrap:anywhere]">
                  Session: {session?.address}
                </span>
              </div>
              <Button
                className="h-11 rounded-full px-5"
                disabled={isAuthenticating}
                onClick={() => void authenticate()}
                size="lg"
                type="button"
              >
                {isAuthenticating ? "Confirming..." : "Confirm ownership again"}
              </Button>
            </div>
          ) : session ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-text-primary">
                Wallet session
              </span>
              <code className="[overflow-wrap:anywhere] text-sm text-text-primary">
                {session.address}
              </code>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-6 text-text-secondary">
                {address
                  ? "Your recipient is already auto-filled from the connected Base Account. Confirm ownership to create a secure session before creating links."
                  : "Create a secure ownership session with your wallet before creating links. In Base Preview or the Base app, your Base Account can still auto-fill the recipient once available."}
              </p>
              <Button
                className="h-11 rounded-full px-5"
                disabled={isAuthenticating}
                onClick={() => void authenticate()}
                size="lg"
                type="button"
              >
                {isAuthenticating ? "Confirming..." : "Confirm ownership"}
              </Button>
            </div>
          )}
          {authError ? (
            <p className="mt-3 text-sm font-medium text-text-error-primary">
              {authError}
            </p>
          ) : null}
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">
              Amount (USDC)
            </span>
            <Input
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
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-text-primary">
                Recipient address
              </span>
              <div className="flex flex-col gap-3 rounded-2xl border border-border-primary bg-bg-secondary-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
                <code className="[overflow-wrap:anywhere] text-sm text-text-primary">
                  {recipientAddress || address}
                </code>
                <Button
                  className="h-9 rounded-full px-4 text-sm"
                  onClick={() => setShowRecipientOverride(true)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Edit
                </Button>
              </div>
              <span className="text-sm leading-6 text-text-tertiary">
                Auto-filled from the connected Base Account.
              </span>
            </div>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-text-primary">
                Recipient address
              </span>
              <Input
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
              <span className="text-sm leading-6 text-text-tertiary">
                {isConnected
                  ? "Connected wallet detected. Override it only if this payment should go somewhere else."
                  : "Wallet autofill works in Base Preview or the Base app. In a normal browser, enter the recipient manually."}
              </span>
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">
              Title (optional)
            </span>
            <Input
              maxLength={120}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Coffee refund"
              type="text"
              value={title}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">
              Note (optional)
            </span>
            <Textarea
              maxLength={500}
              name="note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="USDC on Base only"
              rows={4}
              value={note}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">
              Expiration (optional)
            </span>
            <Input
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              name="expiresAt"
              onChange={(event) => setExpiresAt(event.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </label>

          {error ? (
            <p className="text-sm font-medium text-text-error-primary">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-11 rounded-full px-5"
              disabled={
                isSubmitting ||
                isSessionLoading ||
                isAuthenticating ||
                !session ||
                sessionMismatch
              }
              size="lg"
              type="submit"
            >
              {isSubmitting ? "Creating..." : "Create payment link"}
            </Button>
            <Button asChild className="h-11 rounded-full px-5" size="lg" variant="secondary">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
