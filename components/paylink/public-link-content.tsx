import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Fingerprint,
  Home,
  Link2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type IdentityPresentation } from "@/lib/identity/display";
import {
  PAYMENT_LINK_STATUS,
  type PaymentLinkStatus,
  type PublicPaymentLink,
} from "@/lib/payment-links/shared";

type BadgeVariant = "default" | "success" | "warning" | "destructive";

const STATUS_COPY: Record<PaymentLinkStatus, string> = {
  [PAYMENT_LINK_STATUS.ACTIVE]: "Active Request",
  [PAYMENT_LINK_STATUS.PAID]: "Paid",
  [PAYMENT_LINK_STATUS.EXPIRED]: "Expired",
  [PAYMENT_LINK_STATUS.CANCELED]: "Canceled",
};

const STATUS_VARIANTS: Record<PaymentLinkStatus, BadgeVariant> = {
  [PAYMENT_LINK_STATUS.ACTIVE]: "default",
  [PAYMENT_LINK_STATUS.PAID]: "success",
  [PAYMENT_LINK_STATUS.EXPIRED]: "warning",
  [PAYMENT_LINK_STATUS.CANCELED]: "destructive",
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

function formatRelativeExpiry(value: string | null): string {
  if (!value) {
    return "No expiry";
  }

  const expiresAt = new Date(value).getTime();
  const diff = expiresAt - Date.now();

  if (diff <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function DetailRow({
  children,
  label,
  mono = false,
}: {
  children: React.ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "text-right font-mono text-sm text-text-primary [overflow-wrap:anywhere]"
            : "text-right text-sm text-text-primary"
        }
      >
        {children}
      </dd>
    </div>
  );
}

function CopyValueButton({
  copiedKey,
  copyKey,
  onCopy,
  value,
}: {
  copiedKey: string | null;
  copyKey: string;
  onCopy: (key: string, value: string) => Promise<void>;
  value: string;
}) {
  const copied = copiedKey === copyKey;

  return (
    <Button
      aria-label={copied ? "Address copied" : "Copy address"}
      className="shrink-0 rounded-full"
      onClick={() => void onCopy(copyKey, value)}
      size="icon-xs"
      type="button"
      variant="ghost"
    >
      {copied ? (
        <CheckCircle2 className="size-3.5" strokeWidth={2} />
      ) : (
        <Copy className="size-3.5" strokeWidth={2} />
      )}
    </Button>
  );
}

function AddressDetailBlock({
  address,
  copiedKey,
  copyKey,
  label,
  onCopy,
  primary,
}: {
  address: string;
  copiedKey: string | null;
  copyKey: string;
  label: string;
  onCopy: (key: string, value: string) => Promise<void>;
  primary?: string | null;
}) {
  return (
    <div className="space-y-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </dt>
      <dd className="space-y-1.5 text-sm text-text-primary">
        {primary ? <div className="font-semibold">{primary}</div> : null}
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 font-mono text-sm text-text-primary [overflow-wrap:anywhere]">
            {address}
          </span>
          <CopyValueButton
            copiedKey={copiedKey}
            copyKey={copyKey}
            onCopy={onCopy}
            value={address}
          />
        </div>
      </dd>
    </div>
  );
}

export function PublicLinkPaidState({
  copiedKey,
  link,
  onCopy,
  paidViewMode,
  payerIdentity,
  txUrl,
}: {
  copiedKey: string | null;
  link: PublicPaymentLink;
  onCopy: (key: string, value: string) => Promise<void>;
  paidViewMode: "payer" | "creator" | "generic";
  payerIdentity: IdentityPresentation;
  txUrl: string | null;
}) {
  if (paidViewMode === "payer") {
    return (
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-border-primary bg-bg-secondary/90 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]">
          <div className="relative flex h-48 items-center justify-center overflow-hidden border-b border-border-secondary bg-linear-to-br from-bg-brand-primary/40 via-bg-secondary to-bg-secondary">
            <div className="absolute inset-0 bg-radial-[circle_at_center] from-bg-brand-solid/25 via-transparent to-transparent" />
            <div className="relative flex size-24 items-center justify-center rounded-full border border-border-brand-alt bg-bg-brand-primary/40 shadow-[0_0_64px_rgba(13,204,242,0.2)]">
              <span className="flex size-12 items-center justify-center">
                <CheckCircle2 className="block size-12 shrink-0 text-fg-brand-primary" strokeWidth={1.8} />
              </span>
            </div>
          </div>
          <div className="space-y-6 px-6 py-7">
            <div className="text-center">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-brand-tertiary">
                Payment confirmed
              </p>
              <h2 className="text-[30px] font-bold tracking-tight text-text-primary">
                Payment Sent
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {payerIdentity.primary === payerIdentity.shortAddress
                  ? "Your payment has been verified on Base."
                  : `${payerIdentity.primary}, your payment has been verified on Base.`}
              </p>
            </div>

            <dl className="space-y-4 rounded-[22px] border border-border-secondary bg-bg-primary/60 p-4">
              {link.payerAddress ? (
                <>
                  <AddressDetailBlock
                    address={link.payerAddress}
                    copiedKey={copiedKey}
                    copyKey="paid-by"
                    label="Paid by"
                    onCopy={onCopy}
                    primary={
                      payerIdentity.primary !== link.payerAddress
                        ? payerIdentity.primary
                        : null
                    }
                  />
                  <AddressDetailBlock
                    address={link.walletAddress}
                    copiedKey={copiedKey}
                    copyKey="recipient-address"
                    label="Recipient address"
                    onCopy={onCopy}
                  />
                </>
              ) : null}
              {link.paidAt ? (
                <DetailRow label="Paid at">{formatDate(link.paidAt)}</DetailRow>
              ) : null}
              {txUrl ? (
                <DetailRow label="Transaction">
                  <a
                    className="inline-flex items-center gap-1 text-text-brand-primary hover:text-text-brand-secondary-hover"
                    href={txUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View on BaseScan
                    <ExternalLink className="size-3.5" />
                  </a>
                </DetailRow>
              ) : link.paymentId ? (
                <DetailRow label="Payment id" mono>
                  {link.paymentId}
                </DetailRow>
              ) : null}
            </dl>

            <div className="grid grid-cols-1 gap-2">
              {txUrl ? (
                <Button asChild>
                  <a href={txUrl} rel="noreferrer" target="_blank">
                    <ExternalLink className="size-4" />
                    View transaction
                  </a>
                </Button>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary">
                  <Link href="/">
                    <Home className="size-4" />
                    Home
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/create">
                    <Link2 className="size-4" />
                    Create your own
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (paidViewMode === "creator") {
    return (
      <section className="space-y-6">
        <div className="rounded-[28px] border border-border-primary bg-bg-secondary/90 p-6 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-bg-brand-primary text-fg-brand-primary">
            <span className="flex size-10 items-center justify-center">
              <ShieldCheck className="block size-10 shrink-0" strokeWidth={2} />
            </span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-brand-tertiary">
            Receipt
          </p>
          <h2 className="mt-2 text-[30px] font-bold tracking-tight text-text-primary">
            Payment Received
          </h2>
          <div className="mt-4 inline-flex items-baseline gap-2">
            <span className="text-[40px] font-extrabold tracking-[-0.06em] text-text-brand-primary">
              {formatAmount(link.amountUsdc)}
            </span>
            <span className="text-xl font-medium text-text-secondary">USDC</span>
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            This one-time link is now closed after the verified payment.
          </p>

          <dl className="mt-6 space-y-4 rounded-[22px] border border-border-secondary bg-bg-primary/60 p-4">
            {link.payerAddress ? (
              <>
                <AddressDetailBlock
                  address={link.payerAddress}
                  copiedKey={copiedKey}
                  copyKey="paid-by"
                  label="Paid by"
                  onCopy={onCopy}
                  primary={
                    payerIdentity.primary !== link.payerAddress
                      ? payerIdentity.primary
                      : null
                  }
                />
                <AddressDetailBlock
                  address={link.walletAddress}
                  copiedKey={copiedKey}
                  copyKey="recipient-address"
                  label="Recipient address"
                  onCopy={onCopy}
                />
              </>
            ) : null}
            {link.paidAt ? (
              <DetailRow label="Paid at">{formatDate(link.paidAt)}</DetailRow>
            ) : null}
            {txUrl ? (
              <DetailRow label="Transaction">
                <a
                  className="inline-flex items-center gap-1 text-text-brand-primary hover:text-text-brand-secondary-hover"
                  href={txUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on BaseScan
                  <ExternalLink className="size-3.5" />
                </a>
              </DetailRow>
            ) : link.paymentId ? (
              <DetailRow label="Payment id" mono>
                {link.paymentId}
              </DetailRow>
            ) : null}
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button asChild>
              <Link href="/create">
                <Link2 className="size-4" />
                Create another
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/my-links">
                <ArrowUpRight className="size-4" />
                My links
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-border-primary bg-bg-secondary/90 p-6 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="mx-auto mb-6 flex size-[72px] items-center justify-center rounded-full bg-bg-brand-primary text-fg-brand-primary">
          <span className="flex size-9 items-center justify-center">
            <CheckCircle2 className="block size-9 shrink-0" strokeWidth={1.9} />
          </span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-brand-tertiary">
          Already paid
        </p>
        <h2 className="mt-2 text-[28px] font-bold tracking-tight text-text-primary">
          This pay link has been completed
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          The first successful payment permanently closed this link.
        </p>

        <dl className="mt-6 space-y-4 rounded-[22px] border border-border-secondary bg-bg-primary/60 p-4">
          <DetailRow label="Amount">{formatAmount(link.amountUsdc)} USDC</DetailRow>
          {link.payerAddress ? (
            <>
              <AddressDetailBlock
                address={link.payerAddress}
                copiedKey={copiedKey}
                copyKey="paid-by"
                label="Paid by"
                onCopy={onCopy}
                primary={
                  payerIdentity.primary !== link.payerAddress
                    ? payerIdentity.primary
                    : null
                }
              />
              <AddressDetailBlock
                address={link.walletAddress}
                copiedKey={copiedKey}
                copyKey="recipient-address"
                label="Recipient address"
                onCopy={onCopy}
              />
            </>
          ) : null}
          {link.paidAt ? (
            <DetailRow label="Paid at">{formatDate(link.paidAt)}</DetailRow>
          ) : null}
          {txUrl ? (
            <DetailRow label="Transaction">
              <a
                className="inline-flex items-center gap-1 text-text-brand-primary hover:text-text-brand-secondary-hover"
                href={txUrl}
                rel="noreferrer"
                target="_blank"
              >
                View on BaseScan
                <ExternalLink className="size-3.5" />
              </a>
            </DetailRow>
          ) : null}
        </dl>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button asChild variant="secondary">
            <Link href="/">
              <Home className="size-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/create">
              <Link2 className="size-4" />
              Create your own
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PublicLinkInactiveState({
  link,
}: {
  link: PublicPaymentLink;
}) {
  const isExpired = link.status === PAYMENT_LINK_STATUS.EXPIRED;

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-border-primary bg-bg-secondary/90 p-6 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.75)]">
        <div className="mb-6 flex size-[72px] items-center justify-center rounded-full bg-bg-brand-primary/60 text-text-brand-tertiary">
          <Fingerprint className="size-9" strokeWidth={1.8} />
        </div>
        <Badge variant={STATUS_VARIANTS[link.status]}>{STATUS_COPY[link.status]}</Badge>
        <h2 className="mt-4 text-[28px] font-bold tracking-tight text-text-primary">
          {isExpired ? "This pay link has expired" : "This pay link is unavailable"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          {isExpired
            ? "The payment window for this request has closed. Ask the owner for a fresh link if payment is still needed."
            : "This payment request is no longer open for new payments."}
        </p>

        <div className="my-6 rounded-[22px] border border-border-secondary bg-bg-primary/60 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">
            Requested amount
          </p>
          <p className="mt-3 text-[36px] font-bold tracking-[-0.05em] text-text-quaternary line-through">
            {formatAmount(link.amountUsdc)} USDC
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild>
            <Link href="/">
              <Home className="size-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/create">
              <Link2 className="size-4" />
              New link
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PublicLinkActiveState({
  copiedKey,
  creatorIdentity,
  link,
  onCopy,
  shareUrl,
}: {
  copiedKey: string | null;
  creatorIdentity: IdentityPresentation;
  link: PublicPaymentLink;
  onCopy: (key: string, value: string) => Promise<void>;
  shareUrl: string;
}) {
  return (
    <section className="space-y-6">
      <section className="mb-6 flex flex-col items-center gap-4 text-center">
        {link.creatorPfpUrl ? (
          <div
            aria-label={creatorIdentity.primary}
            className="size-24 rounded-full border-4 border-border-brand-alt bg-bg-tertiary bg-cover bg-center bg-no-repeat"
            role="img"
            style={{ backgroundImage: `url(${link.creatorPfpUrl})` }}
          />
        ) : (
          <div className="inline-flex size-24 items-center justify-center rounded-full border-4 border-border-brand-alt bg-bg-brand-primary text-3xl font-bold text-text-brand-primary">
            {creatorIdentity.avatarFallback}
          </div>
        )}
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-text-primary">
            {creatorIdentity.primary}
          </h1>
          {creatorIdentity.secondary ? (
            <p className="mt-2 text-sm text-text-brand-tertiary">
              {creatorIdentity.secondary}
            </p>
          ) : null}
        </div>
      </section>

      <div className="rounded-[28px] border border-border-primary bg-bg-secondary/90 p-8 text-center shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-brand-alt bg-bg-brand-primary px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-text-brand-primary">
          <ShieldCheck className="size-4" strokeWidth={2} />
          {STATUS_COPY[link.status]}
        </div>
        <h2 className="text-[44px] font-extrabold tracking-[-0.08em] text-text-primary">
          {formatAmount(link.amountUsdc)} USDC
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Payable on Base mainnet
        </p>
      </div>

      {link.title || link.note ? (
        <div className="flex items-stretch gap-4 rounded-[24px] border border-border-primary bg-bg-secondary/80 p-4">
          <div className="min-w-0 flex-1">
            {link.title ? (
              <p className="text-base font-bold text-text-primary">{link.title}</p>
            ) : null}
            {link.note ? (
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {link.note}
              </p>
            ) : null}
          </div>
          <div className="hidden h-20 w-24 rounded-[18px] border border-border-secondary bg-[linear-gradient(135deg,rgba(13,204,242,0.12),rgba(79,70,229,0.20))] sm:block" />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-border-secondary bg-bg-secondary/70 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <RefreshCw className="size-3.5" />
            Expires in
          </p>
          <p className="mt-2 text-sm font-bold text-text-primary">
            {formatRelativeExpiry(link.expiresAt)}
          </p>
        </div>
        <div className="rounded-[22px] border border-border-secondary bg-bg-secondary/70 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <Wallet className="size-3.5" />
            Network
          </p>
          <p className="mt-2 text-sm font-bold text-text-primary">
            Base Mainnet
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-border-secondary bg-bg-secondary/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Wallet address
            </p>
            <p className="mt-2 font-mono text-sm text-text-primary [overflow-wrap:anywhere]">
              {link.walletAddress}
            </p>
          </div>
          <Wallet className="mt-0.5 size-5 shrink-0 text-fg-brand-primary" strokeWidth={2} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          aria-label="Share URL"
          className="h-12 flex-1 text-xs font-mono"
          readOnly
          type="text"
          value={shareUrl}
        />
        <Button onClick={() => void onCopy("share", shareUrl)} type="button" variant="outline">
          <Copy className="size-4" />
          {copiedKey === "share" ? "Copied" : "Copy"}
        </Button>
      </div>
    </section>
  );
}
