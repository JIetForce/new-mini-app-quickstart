import { NextRequest, NextResponse } from "next/server";

import {
  clearWalletSession,
  getWalletSession,
  mapSupabaseAuthError,
} from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getWalletSession(request);
    const response = NextResponse.json({ session });

    if (!session) {
      clearWalletSession(response);
    }

    return response;
  } catch (error) {
    const authError = mapSupabaseAuthError(error);

    if (authError) {
      return NextResponse.json(
        { message: authError.message },
        { status: authError.status },
      );
    }

    return NextResponse.json(
      {
        message: "Unable to read wallet session.",
      },
      { status: 500 },
    );
  }
}
