import { NextRequest, NextResponse } from "next/server";

import {
  PaymentLinkServiceError,
  confirmPaymentLink,
} from "@/lib/payment-links/server";
import { toPublicPaymentLink } from "@/lib/payment-links/shared";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const { attempt, link } = await confirmPaymentLink(slug, body);

    return NextResponse.json({
      attempt,
      link: toPublicPaymentLink(link),
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
        message:
          error instanceof Error
            ? error.message
            : "Unable to confirm payment link.",
      },
      { status: 500 },
    );
  }
}
