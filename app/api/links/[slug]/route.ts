import { NextResponse } from "next/server";

import {
  PaymentLinkServiceError,
  buildPaymentLinkUrl,
  getPaymentLinkBySlug,
} from "@/lib/payment-links/server";
import { toPublicPaymentLink } from "@/lib/payment-links/shared";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const link = await getPaymentLinkBySlug(slug, { syncExpired: true });

    if (!link) {
      return NextResponse.json(
        { message: "Payment link not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      link: toPublicPaymentLink(link),
      shareUrl: buildPaymentLinkUrl(link.slug),
    });
  } catch (error) {
    if (error instanceof PaymentLinkServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        message: "Unable to load payment link.",
      },
      { status: 500 },
    );
  }
}
