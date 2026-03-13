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
          error instanceof Error
            ? error.message
            : "Unable to create wallet auth nonce.",
      },
      { status: 500 },
    );
  }
}
