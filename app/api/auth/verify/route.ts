import { NextRequest, NextResponse } from "next/server";

import {
  clearPreAuthState,
  createWalletSession,
  mapSupabaseAuthError,
  setWalletSession,
  verifyWalletSession,
} from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = await verifyWalletSession(request, body);
    const session = createWalletSession(address);
    const response = NextResponse.json({ session });

    clearPreAuthState(response);
    setWalletSession(response, session);

    return response;
  } catch (error) {
    const authError = mapSupabaseAuthError(error);

    if (authError) {
      const response = NextResponse.json(
        { message: authError.message },
        { status: authError.status },
      );

      clearPreAuthState(response);

      return response;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify wallet sign-in.",
      },
      { status: 500 },
    );
  }
}
