import { NextRequest, NextResponse } from "next/server";

import { resolveBasenames } from "@/lib/identity/server";
import {
  applyRateLimitHeaders,
  buildRateLimitResponse,
  checkRateLimit,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const identityResolveRateLimitRule = {
  key: "identity-resolve",
  limit: 60,
  windowMs: 5 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, identityResolveRateLimitRule);

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(
      "Too many identity lookups requested. Please try again shortly.",
      rateLimit,
    );
  }

  try {
    const body = await request.json();
    const addresses = Array.isArray(body?.addresses)
      ? body.addresses.slice(0, 24)
      : [];
    const names = await resolveBasenames(addresses);

    const response = NextResponse.json({ names });

    applyRateLimitHeaders(response, rateLimit);

    return response;
  } catch {
    const response = NextResponse.json(
      {
        message: "Unable to resolve Base names.",
      },
      { status: 500 },
    );

    applyRateLimitHeaders(response, rateLimit);

    return response;
  }
}
