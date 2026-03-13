import { NextRequest, NextResponse } from "next/server";

import {
  mapSupabaseAuthError,
  requireWalletSession,
} from "@/lib/auth/server";
import {
  PaymentLinkServiceError,
  buildPaymentLinkUrl,
  createPaymentLink,
} from "@/lib/payment-links/server";
import { toPublicPaymentLink } from "@/lib/payment-links/shared";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = requireWalletSession(request);
    const body = await request.json();
    const link = await createPaymentLink({
      ...body,
      creatorAddress: session.address,
    });

    return NextResponse.json(
      {
        link: toPublicPaymentLink(link),
        shareUrl: buildPaymentLinkUrl(link.slug),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PaymentLinkServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    const authError = mapSupabaseAuthError(error);

    if (authError) {
      return NextResponse.json(
        { message: authError.message },
        { status: authError.status },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to create payment link.",
      },
      { status: 500 },
    );
  }
}
