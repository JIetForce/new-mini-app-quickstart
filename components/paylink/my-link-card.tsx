import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Link2,
  ReceiptText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUtcTimestamp } from "@/lib/format/date";
import { buildBaseScanTxUrl } from "@/lib/identity/display";
import {
  PAYMENT_LINK_STATUS,
  type PaymentLinkStatus,
  type PublicPaymentLink,
} from "@/lib/payment-links/shared";

const STATUS_VARIANTS: Record<
  PaymentLinkStatus,
  "default" | "success" | "warning" | "destructive"
> = {
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

interface MyLinkCardProps {
  copiedKey: string | null;
  link: PublicPaymentLink;
  onCopyLink: (slug: string) => Promise<void>;
  onCopyValue: (key: string, value: string) => Promise<void>;
  payerLabel: string | null;
}

export function MyLinkCard({
  copiedKey,
  link,
  onCopyLink,
  onCopyValue,
  payerLabel,
}: MyLinkCardProps) {
  const txUrl = buildBaseScanTxUrl(link.paymentId);

  return (
    <article className="overflow-hidden rounded-[28px] border border-border-primary bg-bg-secondary/80 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.65)]">
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANTS[link.status]}>
                {link.status}
              </Badge>
              <span className="text-xs text-text-tertiary">
                Created {formatUtcTimestamp(link.createdAt)}
              </span>
            </div>
            <h2 className="text-xl font-bold leading-6 text-text-primary">
              {link.title || `${formatAmount(link.amountUsdc)} USDC`}
            </h2>
            <p className="mt-2 text-2xl font-bold text-text-brand-primary">
              {formatAmount(link.amountUsdc)} USDC
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-[18px] border border-border-primary bg-[linear-gradient(145deg,rgba(13,204,242,0.16),rgba(79,70,229,0.24))]">
            <Link2 className="size-6 text-fg-brand-primary" strokeWidth={2} />
          </div>
        </div>

        {link.payerAddress || link.paidAt ? (
          <dl className="space-y-3 rounded-[22px] border border-border-secondary bg-bg-primary/55 p-4">
            {link.payerAddress ? (
              <div className="space-y-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  Paid by
                </dt>
                <dd className="space-y-1.5 text-sm text-text-primary">
                  {payerLabel && payerLabel !== link.payerAddress ? (
                    <div className="font-semibold">{payerLabel}</div>
                  ) : null}
                  <div className="font-mono text-xs text-text-tertiary [overflow-wrap:anywhere]">
                    {link.payerAddress}
                  </div>
                </dd>
              </div>
            ) : null}

            {link.paidAt ? (
              <div className="space-y-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  Paid at
                </dt>
                <dd className="text-sm text-text-primary">
                  {formatUtcTimestamp(link.paidAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            onClick={() => void onCopyLink(link.slug)}
            type="button"
            variant="outline"
          >
            <Copy className="size-4" />
            {copiedKey === `link:${link.slug}` ? "Copied" : "Copy link"}
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/r/${link.slug}`}>
              <ArrowUpRight className="size-4" />
              Open link
            </Link>
          </Button>
          {txUrl ? (
            <Button asChild className="sm:col-span-2" variant="ghost">
              <a href={txUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="size-4" />
                View transaction
              </a>
            </Button>
          ) : null}
          {link.paymentId ? (
            <Button
              className={txUrl ? "sm:col-span-2" : ""}
              onClick={() =>
                void onCopyValue(`tx:${link.id}`, link.paymentId as string)
              }
              type="button"
              variant="ghost"
            >
              <ReceiptText className="size-4" />
              {copiedKey === `tx:${link.id}`
                ? "Transaction copied"
                : txUrl
                  ? "Copy transaction hash"
                  : "Copy payment id"}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
