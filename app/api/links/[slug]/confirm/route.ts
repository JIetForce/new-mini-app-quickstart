import { NextRequest, NextResponse } from "next/server";

import {
  PaymentLinkServiceError,
  confirmPaymentLink,
} from "@/lib/payment-links/server";
import { toPublicPaymentLink } from "@/lib/payment-links/shared";
import {
  applyRateLimitHeaders,
  buildRateLimitResponse,
  checkRateLimit,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const confirmRateLimitRule = {
  key: "payment-confirm",
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const rateLimit = checkRateLimit(request, confirmRateLimitRule, slug);

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(
      "Too many payment confirmation checks requested. Please try again shortly.",
      rateLimit,
    );
  }

  try {
    const body = await request.json();
    const { attempt, link } = await confirmPaymentLink(slug, body);

    const response = NextResponse.json({
      attempt,
      link: toPublicPaymentLink(link),
    });

    applyRateLimitHeaders(response, rateLimit);

    return response;
  } catch (error) {
    if (error instanceof PaymentLinkServiceError) {
      const response = NextResponse.json(
        { message: error.message },
        { status: error.status },
      );

      applyRateLimitHeaders(response, rateLimit);

      return response;
    }

    const response = NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to confirm payment link.",
      },
      { status: 500 },
    );

    applyRateLimitHeaders(response, rateLimit);

    return response;
  }
}
