import { NextRequest, NextResponse } from "next/server";

import {
  mapSupabaseAuthError,
  requireWalletSession,
} from "@/lib/auth/server";
import {
  PaymentLinkServiceError,
  getCreatorPaymentLinks,
} from "@/lib/payment-links/server";
import {
  isPaymentLinkStatus,
  toPublicPaymentLink,
} from "@/lib/payment-links/shared";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = requireWalletSession(request);
    const searchParams = request.nextUrl.searchParams;
    const rawStatus = searchParams.get("status");
    const status =
      rawStatus && isPaymentLinkStatus(rawStatus)
        ? rawStatus
        : undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");
    const result = await getCreatorPaymentLinks({
      creatorAddress: session.address,
      page,
      pageSize,
      status,
    });

    return NextResponse.json({
      ...result,
      links: result.links.map(toPublicPaymentLink),
      status: status ?? null,
    });
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
        message: "Unable to load wallet links.",
      },
      { status: 500 },
    );
  }
}
