import { notFound } from "next/navigation";

import {
  buildPaymentLinkUrl,
  getPaymentLinkBySlug,
} from "@/lib/payment-links/server";
import { toPublicPaymentLink } from "@/lib/payment-links/shared";

import PaymentLinkClient from "./PaymentLinkClient";

export const dynamic = "force-dynamic";

export default async function PaymentLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const link = await getPaymentLinkBySlug(slug, { syncExpired: true });

  if (!link) {
    notFound();
  }

  return (
    <PaymentLinkClient
      initialLink={toPublicPaymentLink(link)}
      initialShareUrl={buildPaymentLinkUrl(link.slug)}
    />
  );
}
