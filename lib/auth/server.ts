import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  generateSiweNonce,
  parseSiweMessage,
  validateSiweMessage,
} from "viem/siwe";

import { getAppUrl, getRequiredEnv } from "@/lib/env";
import {
  NONCE_TTL_MS,
  PAY_LINK_CHAIN_ID,
  PAY_LINK_SESSION_COOKIE,
  SESSION_TTL_MS,
  SIWE_FUTURE_SKEW_MS,
  type VerifyWalletSessionInput,
  type WalletSession,
  normalizeWalletAddress,
  normalizeWalletSignature,
} from "./shared";
import {
  SupabaseRequestError,
  supabaseAdminRequest,
} from "@/lib/supabase/server";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

type WalletAuthNonceRecord = {
  nonce: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

type ConsumeNonceResponse = boolean;

export class WalletAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "WalletAuthError";
  }
}

function getSessionSecret(): string {
  return getRequiredEnv("PAY_LINK_SESSION_SECRET");
}

function buildQuery(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

function encodeCookieData(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeCookieData(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signCookiePayload(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseSessionCookie(value: string | undefined): WalletSession | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signCookiePayload(payload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(decodeCookieData(payload)) as WalletSession;
    const address = normalizeWalletAddress(session.address, "Session address");
    const issuedAt = new Date(session.issuedAt);
    const expiresAt = new Date(session.expiresAt);

    if (
      Number.isNaN(issuedAt.getTime()) ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    return {
      address,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch {
    return null;
  }
}

function serializeSessionCookie(session: WalletSession): string {
  const payload = encodeCookieData(JSON.stringify(session));
  const signature = signCookiePayload(payload);

  return `${payload}.${signature}`;
}

function resolveExpectedOrigin(request: NextRequest): {
  domain: string;
  origin: string;
  scheme: string;
} {
  const appUrl = new URL(getAppUrl());
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const forwardedHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host ??
    appUrl.host;
  const scheme = forwardedProto.replace(":", "") || appUrl.protocol.replace(":", "");
  const domain = forwardedHost || appUrl.host;

  return {
    domain,
    origin: `${scheme}://${domain}`,
    scheme,
  };
}

async function fetchWalletAuthNonce(
  nonce: string,
): Promise<WalletAuthNonceRecord | null> {
  const rows = await supabaseAdminRequest<WalletAuthNonceRecord[]>(
    `/wallet_auth_nonces?${buildQuery({
      select: "*",
      nonce: `eq.${nonce}`,
      consumed_at: "is.null",
      limit: "1",
    })}`,
  );

  return rows[0] ?? null;
}

function assertValidDate(value: Date | undefined, fieldName: string): void {
  if (value && Number.isNaN(value.getTime())) {
    throw new WalletAuthError(`${fieldName} must be a valid datetime.`, 400);
  }
}

function assertIssuedAt(value: Date | undefined, now: Date): void {
  assertValidDate(value, "Issued At");

  if (value && value.getTime() > now.getTime() + SIWE_FUTURE_SKEW_MS) {
    throw new WalletAuthError("Issued At cannot be in the future.", 400);
  }
}

function normalizeVerifyInput(value: unknown): VerifyWalletSessionInput {
  if (!value || typeof value !== "object") {
    throw new WalletAuthError("Invalid SIWE verification payload.", 400);
  }

  const payload = value as Record<string, unknown>;
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!message) {
    throw new WalletAuthError("SIWE message is required.", 400);
  }

  return {
    address:
      payload.address == null || payload.address === ""
        ? null
        : normalizeWalletAddress(payload.address, "Address"),
    message,
    signature: normalizeWalletSignature(payload.signature),
  };
}

export function getWalletSession(request: NextRequest): WalletSession | null {
  return parseSessionCookie(request.cookies.get(PAY_LINK_SESSION_COOKIE)?.value);
}

export function requireWalletSession(request: NextRequest): WalletSession {
  const session = getWalletSession(request);

  if (!session) {
    throw new WalletAuthError("Wallet session is required.", 401);
  }

  return session;
}

export function clearWalletSession(response: NextResponse): void {
  response.cookies.set(PAY_LINK_SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function createWalletSession(address: string): WalletSession {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS);
  return {
    address: normalizeWalletAddress(address, "Session address"),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function setWalletSession(
  response: NextResponse,
  session: WalletSession,
): void {
  response.cookies.set(PAY_LINK_SESSION_COOKIE, serializeSessionCookie(session), {
    expires: new Date(session.expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createWalletAuthNonce(): Promise<string> {
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

  await supabaseAdminRequest("/wallet_auth_nonces", {
    method: "POST",
    body: JSON.stringify({
      nonce,
      expires_at: expiresAt,
    }),
  });

  return nonce;
}

export async function verifyWalletSession(
  request: NextRequest,
  value: unknown,
): Promise<string> {
  const input = normalizeVerifyInput(value);
  const parsed = parseSiweMessage(input.message);
  const now = new Date();

  if (!parsed.address) {
    throw new WalletAuthError("SIWE message address is missing.", 400);
  }

  if (parsed.version !== "1") {
    throw new WalletAuthError("SIWE message version is invalid.", 400);
  }

  if (parsed.chainId !== PAY_LINK_CHAIN_ID) {
    throw new WalletAuthError("SIWE message must target Base mainnet.", 400);
  }

  assertValidDate(parsed.expirationTime, "Expiration Time");
  assertValidDate(parsed.notBefore, "Not Before");
  assertIssuedAt(parsed.issuedAt, now);

  const expectedAddress = input.address ?? normalizeWalletAddress(parsed.address);
  const expectedOrigin = resolveExpectedOrigin(request);
  const nonce = typeof parsed.nonce === "string" ? parsed.nonce.trim() : "";

  try {
    if (!parsed.uri || new URL(parsed.uri).origin !== expectedOrigin.origin) {
      throw new WalletAuthError("SIWE URI is invalid for this app origin.", 400);
    }
  } catch (error) {
    if (error instanceof WalletAuthError) {
      throw error;
    }

    throw new WalletAuthError("SIWE URI is invalid for this app origin.", 400);
  }

  if (!nonce) {
    throw new WalletAuthError("SIWE nonce is missing.", 400);
  }

  const nonceRecord = await fetchWalletAuthNonce(nonce);

  if (!nonceRecord) {
    throw new WalletAuthError("SIWE nonce is invalid or already used.", 401);
  }

  if (new Date(nonceRecord.expires_at).getTime() <= now.getTime()) {
    throw new WalletAuthError("SIWE nonce has expired.", 401);
  }

  const isValidMessage = validateSiweMessage({
    address: expectedAddress,
    domain: expectedOrigin.domain,
    message: parsed,
    nonce,
    scheme: parsed.scheme ? expectedOrigin.scheme : undefined,
    time: now,
  });

  if (!isValidMessage) {
    throw new WalletAuthError("SIWE message validation failed.", 401);
  }

  const isValidSignature = await publicClient.verifySiweMessage({
    address: expectedAddress,
    domain: expectedOrigin.domain,
    message: input.message,
    nonce,
    scheme: parsed.scheme ? expectedOrigin.scheme : undefined,
    signature: input.signature,
    time: now,
  });

  if (!isValidSignature) {
    throw new WalletAuthError("SIWE signature verification failed.", 401);
  }

  const consumed = await supabaseAdminRequest<ConsumeNonceResponse>(
    "/rpc/consume_wallet_auth_nonce",
    {
      method: "POST",
      body: JSON.stringify({ p_nonce: nonce }),
    },
  );

  if (!consumed) {
    throw new WalletAuthError("SIWE nonce has already been used.", 401);
  }

  return expectedAddress;
}

export function mapSupabaseAuthError(error: unknown): WalletAuthError | null {
  if (error instanceof WalletAuthError) {
    return error;
  }

  if (error instanceof SupabaseRequestError) {
    return new WalletAuthError(error.message, error.status);
  }

  return null;
}
