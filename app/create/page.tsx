"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Link2, LockKeyhole, Wallet } from "lucide-react";
import { useAccount } from "wagmi";

import { FormField } from "@/components/paylink/form-field";
import { PageTopBar } from "@/components/paylink/top-bar";
import { WalletSessionCard } from "@/components/paylink/wallet-session-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWalletSession } from "@/lib/auth/useWalletSession";
import { getIdentityPresentation } from "@/lib/identity/display";
import { useResolvedNames } from "@/lib/identity/useResolvedNames";
import {
  PAYMENT_LINK_EXPIRATION_OPTIONS,
  PAYMENT_LINK_EXPIRATION_PRESET,
  normalizeUsdcAmount,
  type PaymentLinkExpirationPreset,
} from "@/lib/payment-links/shared";

import { useMiniApp } from "../providers/MiniAppProvider";

export default function CreatePage() {
  const router = useRouter();
  const { address } = useAccount();
  const { context } = useMiniApp();
  const {
    authenticate,
    error: authError,
    isAuthenticating,
    isLoading: isSessionLoading,
    session,
    sessionMismatch,
  } = useWalletSession();
  const { names } = useResolvedNames([address, session?.address]);
  const [amountUsdc, setAmountUsdc] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [expirationPreset, setExpirationPreset] =
    useState<PaymentLinkExpirationPreset>(
      PAYMENT_LINK_EXPIRATION_PRESET.NEVER,
    );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedAmount = amountUsdc.trim();

  const creatorFid =
    typeof context?.user?.fid === "number" && context.user.fid > 0
      ? context.user.fid
      : null;
  const payoutAddress = session?.address ?? address ?? null;
  const isSessionReady = Boolean(session && !sessionMismatch);
  const connectedIdentity = getIdentityPresentation({
    address: payoutAddress,
    basename:
      names[session?.address ?? ""] ?? names[address ?? ""] ?? null,
  });
  const sessionState = isSessionLoading
    ? "loading"
    : sessionMismatch
      ? "mismatch"
      : session
        ? "verified"
        : "needs_auth";
  const sessionDescription = useMemo(() => {
    if (sessionMismatch) {
      return "Your connected wallet and verified session do not match. Re-confirm ownership before creating a link.";
    }

    if (session) {
      return "This verified wallet session authorizes owner actions. New links always pay into this same wallet.";
    }

    return "Confirm wallet ownership to create a verified session before making a pay link.";
  }, [session, sessionMismatch]);
  const amountError = useMemo(() => {
    if (!trimmedAmount) {
      return null;
    }

    try {
      normalizeUsdcAmount(trimmedAmount);
      return null;
    } catch (validationError) {
      return validationError instanceof Error
        ? validationError.message
        : "Enter a valid USDC amount.";
    }
  }, [trimmedAmount]);
  const canProceed =
    Boolean(payoutAddress) &&
    Boolean(trimmedAmount) &&
    !amountError &&
    !isSubmitting &&
    !isAuthenticating &&
    !isSessionLoading;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!trimmedAmount || amountError) {
      setError(amountError || "Enter a valid USDC amount.");
      return;
    }

    if (!session || sessionMismatch) {
      setError("Confirm wallet ownership before creating a payment link.");
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
          expirationPreset,
          title,
          note,
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
    <main className="min-h-screen bg-bg-primary">
      <PageTopBar
        title="Create Pay Link"
        backHref="/"
        rightAction={
          <Button asChild size="sm" variant="link">
            <Link href="/my-links">My links</Link>
          </Button>
        }
      />

      <form
        autoComplete="off"
        className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md flex-col px-4 pb-40 pt-6"
        onSubmit={handleSubmit}
      >
        <div className="space-y-8">
          <section className="space-y-5">
            <div className="flex items-center gap-2 text-text-brand-tertiary">
              <Coins className="size-4" strokeWidth={2.1} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em]">
                Payment Details
              </h2>
            </div>

            <FormField errorText={amountError} label="Amount (USDC)" required>
              <div className="relative">
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  className="h-14 pr-24 text-xl font-semibold"
                  inputMode="decimal"
                  min="0"
                  name="amountUsdc"
                  onChange={(event) => setAmountUsdc(event.target.value)}
                  placeholder="0.00"
                  required
                  spellCheck={false}
                  type="text"
                  value={amountUsdc}
                />
                <div className="absolute inset-y-3 right-3 inline-flex items-center rounded-2xl border border-border-brand-alt bg-bg-brand-primary px-3 text-sm font-bold text-text-brand-primary">
                  USDC
                </div>
              </div>
            </FormField>

            <FormField
              helperText="At creation time the app stores your verified owner wallet as the receiving address. It is not editable."
              label="Receiving Wallet"
            >
              <div className="rounded-[24px] border border-border-primary bg-bg-secondary/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-bg-brand-primary text-fg-brand-primary">
                    <Wallet className="size-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-brand-tertiary">
                      {connectedIdentity.primary === connectedIdentity.shortAddress
                        ? "Owner wallet"
                        : connectedIdentity.primary}
                    </p>
                    {payoutAddress ? (
                      <p className="mt-1 font-mono text-sm text-text-primary [overflow-wrap:anywhere]">
                        {payoutAddress}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-text-secondary">
                        Your wallet address appears here inside Base App or after wallet connection.
                      </p>
                    )}
                  </div>
                  {isSessionReady ? (
                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Verified
                    </div>
                  ) : null}
                </div>
              </div>
            </FormField>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2 text-text-brand-tertiary">
              <LockKeyhole className="size-4" strokeWidth={2.1} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em]">
                Configuration
              </h2>
            </div>

            <FormField label="Link Title" optional>
              <Input
                maxLength={120}
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Services rendered"
                type="text"
                value={title}
              />
            </FormField>

            <FormField label="Note" optional>
              <Textarea
                maxLength={500}
                name="note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Describe the reason for payment..."
                rows={3}
                value={note}
              />
            </FormField>

            <FormField label="Expiration" optional>
              <Select
                onValueChange={(value) =>
                  setExpirationPreset(value as PaymentLinkExpirationPreset)
                }
                value={expirationPreset}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_LINK_EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </section>

          <WalletSessionCard
            connectedAddress={address}
            connectedLabel={connectedIdentity.primary}
            description={sessionDescription}
            error={authError || error}
            isAuthenticating={isAuthenticating}
            onConfirm={() => void authenticate()}
            sessionAddress={session?.address}
            state={sessionState}
          />
        </div>

        <div
          className="fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent px-4 pt-10"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          }}
        >
          <div className="mx-auto w-full max-w-md space-y-3">
            <Button
              className="h-14 w-full text-base"
              disabled={!canProceed}
              onClick={isSessionReady ? undefined : () => void authenticate()}
              type={isSessionReady ? "submit" : "button"}
            >
              <Link2 className="size-[18px]" />
              {isSessionReady
                ? isSubmitting
                  ? "Creating link..."
                  : "Create Pay Link"
                : isAuthenticating
                  ? "Confirming ownership..."
                  : "Confirm wallet ownership"}
            </Button>
            <p className="px-5 text-center text-[11px] leading-4 text-text-tertiary">
              Link creation uses your verified wallet session. The payment destination is always that same owner wallet.
            </p>
          </div>
        </div>
      </form>
    </main>
  );
}
