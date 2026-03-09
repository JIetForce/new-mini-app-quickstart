import { NextRequest, NextResponse } from "next/server";

import {
  PaymentLinkServiceError,
  getCreatorPaymentLinks,
} from "@/lib/payment-links/server";
import {
  PAYMENT_LINK_STATUSES,
  type PaymentLinkStatus,
  toPublicPaymentLink,
} from "@/lib/payment-links/shared";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorAddress = searchParams.get("creatorAddress");

    if (!creatorAddress) {
      return NextResponse.json(
        { message: "Creator address is required." },
        { status: 400 },
      );
    }

    const rawStatus = searchParams.get("status");
    const status =
      rawStatus && PAYMENT_LINK_STATUSES.includes(rawStatus as PaymentLinkStatus)
        ? (rawStatus as PaymentLinkStatus)
        : undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");
    const result = await getCreatorPaymentLinks({
      creatorAddress,
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

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load creator links.",
      },
      { status: 500 },
    );
  }
}
