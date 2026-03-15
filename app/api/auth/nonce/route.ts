import { NextRequest, NextResponse } from "next/server";

import {
  createWalletAuthNonce,
  mapSupabaseAuthError,
  setPreAuthState,
} from "@/lib/auth/server";
import {
  applyRateLimitHeaders,
  buildRateLimitResponse,
  checkRateLimit,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const nonceRateLimitRule = {
  key: "auth-nonce",
  limit: 20,
  windowMs: 10 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, nonceRateLimitRule);

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(
      "Too many sign-in challenges requested. Please try again shortly.",
      rateLimit,
    );
  }

  try {
    const { nonce, preAuthState } = await createWalletAuthNonce(request);
    const response = NextResponse.json({ nonce });

    setPreAuthState(response, preAuthState);
    applyRateLimitHeaders(response, rateLimit);

    return response;
  } catch (error) {
    console.error("GET /api/auth/nonce failed", error);
    const authError = mapSupabaseAuthError(error);

    if (authError) {
      const response = NextResponse.json(
        {
          code: "wallet_auth_nonce_failed",
          message: "Unable to initialize wallet sign-in.",
        },
        { status: authError.status },
      );

      applyRateLimitHeaders(response, rateLimit);

      return response;
    }

    const response = NextResponse.json(
      {
        code: "wallet_auth_nonce_failed",
        message: "Unable to initialize wallet sign-in.",
      },
      { status: 500 },
    );

    applyRateLimitHeaders(response, rateLimit);

    return response;
  }
}
