import { NextRequest, NextResponse } from "next/server";

import { resolveBasenames } from "@/lib/identity/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const addresses = Array.isArray(body?.addresses)
      ? body.addresses.slice(0, 24)
      : [];
    const names = await resolveBasenames(addresses);

    return NextResponse.json({ names });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to resolve Base names.",
      },
      { status: 500 },
    );
  }
}
