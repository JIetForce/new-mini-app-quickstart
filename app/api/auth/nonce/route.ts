import { NextResponse } from "next/server";

import {
  createWalletAuthNonce,
  mapSupabaseAuthError,
} from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const nonce = await createWalletAuthNonce();

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("GET /api/auth/nonce failed", error);
    const authError = mapSupabaseAuthError(error);

    if (authError) {
      return NextResponse.json(
        {
          code: "wallet_auth_nonce_failed",
          message: "Unable to initialize wallet sign-in.",
        },
        { status: authError.status },
      );
    }

    return NextResponse.json(
      {
        code: "wallet_auth_nonce_failed",
        message: "Unable to initialize wallet sign-in.",
      },
      { status: 500 },
    );
  }
}
