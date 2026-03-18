import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  generateSiweNonce,
  parseSiweMessage,
  validateSiweMessage,
} from "viem/siwe";

import { getAppUrl, getOptionalEnv, getRequiredEnv } from "@/lib/env";
import {
  NONCE_TTL_MS,
  PAY_LINK_PRE_AUTH_COOKIE,
  PAY_LINK_CHAIN_ID,
  PAY_LINK_SESSION_COOKIE,
  PRE_AUTH_STATE_TTL_MS,
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
  state_hash: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

type ConsumeNonceResponse = boolean;

type PreAuthStateCookie = {
  state: string;
  issuedAt: string;
  expiresAt: string;
};

type AllowedAuthOrigin = {
  domain: string;
  origin: string;
  scheme: string;
};

const LOCAL_DEV_AUTH_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

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

function signCookiePayload(kind: "session" | "preauth", payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(`${kind}.${payload}`)
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

function buildSignedCookieValue(
  kind: "session" | "preauth",
  payload: string,
): string {
  const signature = signCookiePayload(kind, payload);
  return `${payload}.${signature}`;
}

function parseSignedCookiePayload(
  kind: "session" | "preauth",
  value: string | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signCookiePayload(kind, payload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  return payload;
}

function parseSessionCookie(value: string | undefined): WalletSession | null {
  const payload = parseSignedCookiePayload("session", value);

  if (!payload) {
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
  return buildSignedCookieValue("session", payload);
}

function hashPreAuthState(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createPreAuthStateToken(): string {
  return randomBytes(32).toString("base64url");
}

function parsePreAuthCookie(value: string | undefined): PreAuthStateCookie | null {
  const payload = parseSignedCookiePayload("preauth", value);

  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeCookieData(payload)) as PreAuthStateCookie;
    const issuedAt = new Date(parsed.issuedAt);
    const expiresAt = new Date(parsed.expiresAt);

    if (
      typeof parsed.state !== "string" ||
      !parsed.state ||
      Number.isNaN(issuedAt.getTime()) ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    return {
      state: parsed.state,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  } catch {
    return null;
  }
}

function serializePreAuthCookie(value: PreAuthStateCookie): string {
  const payload = encodeCookieData(JSON.stringify(value));
  return buildSignedCookieValue("preauth", payload);
}

function createPreAuthCookie(
  state: string,
  ttlMs = PRE_AUTH_STATE_TTL_MS,
): PreAuthStateCookie {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ttlMs);

  return {
    state,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function getOrCreatePreAuthCookie(request: NextRequest): PreAuthStateCookie {
  const existing = parsePreAuthCookie(
    request.cookies.get(PAY_LINK_PRE_AUTH_COOKIE)?.value,
  );

  if (!existing) {
    return createPreAuthCookie(createPreAuthStateToken());
  }

  return createPreAuthCookie(existing.state);
}

function parseAllowedOrigin(value: string, fieldName: string): AllowedAuthOrigin {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${fieldName} must contain valid absolute URL origins.`);
  }

  return {
    domain: url.host,
    origin: url.origin,
    scheme: url.protocol.replace(":", ""),
  };
}

function getAllowedAuthOrigins(): AllowedAuthOrigin[] {
  const configuredOrigins = [
    getAppUrl(),
    ...(process.env.NODE_ENV === "production" ? [] : LOCAL_DEV_AUTH_ORIGINS),
  ];
  const extraOrigins = (getOptionalEnv("PAY_LINK_ALLOWED_AUTH_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const seen = new Set<string>();

  return [...configuredOrigins, ...extraOrigins].map((value, index) => {
    const origin = parseAllowedOrigin(
      value,
      index === 0 ? "NEXT_PUBLIC_URL" : "PAY_LINK_ALLOWED_AUTH_ORIGINS",
    );

    if (seen.has(origin.origin)) {
      return null;
    }

    seen.add(origin.origin);
    return origin;
  }).filter((value): value is AllowedAuthOrigin => Boolean(value));
}

function resolveAllowedAuthOrigin(uri: string): AllowedAuthOrigin {
  let parsedUri: URL;

  try {
    parsedUri = new URL(uri);
  } catch {
    throw new WalletAuthError("SIWE URI is invalid for this app origin.", 400);
  }

  const allowedOrigin = getAllowedAuthOrigins().find(
    (origin) => origin.origin === parsedUri.origin,
  );

  if (!allowedOrigin) {
    throw new WalletAuthError("SIWE URI is invalid for this app origin.", 400);
  }

  return allowedOrigin;
}

function requirePreAuthCookie(request: NextRequest): PreAuthStateCookie {
  const cookie = parsePreAuthCookie(
    request.cookies.get(PAY_LINK_PRE_AUTH_COOKIE)?.value,
  );

  if (!cookie) {
    throw new WalletAuthError(
      "Wallet sign-in must start from the same browser that requested the challenge.",
      401,
    );
  }

  return cookie;
}

async function fetchWalletAuthNonce(
  nonce: string,
  stateHash: string,
): Promise<WalletAuthNonceRecord | null> {
  const rows = await supabaseAdminRequest<WalletAuthNonceRecord[]>(
    `/wallet_auth_nonces?${buildQuery({
      select: "*",
      nonce: `eq.${nonce}`,
      state_hash: `eq.${stateHash}`,
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
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearPreAuthState(response: NextResponse): void {
  response.cookies.set(PAY_LINK_PRE_AUTH_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
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
    maxAge: Math.max(
      0,
      Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
    ),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function setPreAuthState(
  response: NextResponse,
  preAuthState: PreAuthStateCookie,
): void {
  response.cookies.set(
    PAY_LINK_PRE_AUTH_COOKIE,
    serializePreAuthCookie(preAuthState),
    {
      expires: new Date(preAuthState.expiresAt),
      httpOnly: true,
      maxAge: Math.max(
        0,
        Math.floor((new Date(preAuthState.expiresAt).getTime() - Date.now()) / 1000),
      ),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function createWalletAuthNonce(
  request: NextRequest,
): Promise<{ nonce: string; preAuthState: PreAuthStateCookie }> {
  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();
  const preAuthState = getOrCreatePreAuthCookie(request);

  await supabaseAdminRequest("/wallet_auth_nonces", {
    method: "POST",
    body: JSON.stringify({
      nonce,
      state_hash: hashPreAuthState(preAuthState.state),
      expires_at: expiresAt,
    }),
  });

  return {
    nonce,
    preAuthState,
  };
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
  const preAuthState = requirePreAuthCookie(request);
  const matchedOrigin = resolveAllowedAuthOrigin(parsed.uri ?? "");
  const nonce = typeof parsed.nonce === "string" ? parsed.nonce.trim() : "";

  if (!nonce) {
    throw new WalletAuthError("SIWE nonce is missing.", 400);
  }

  const stateHash = hashPreAuthState(preAuthState.state);
  const nonceRecord = await fetchWalletAuthNonce(nonce, stateHash);

  if (!nonceRecord) {
    throw new WalletAuthError(
      "SIWE challenge is invalid, expired, already used, or bound to a different browser state.",
      401,
    );
  }

  if (new Date(nonceRecord.expires_at).getTime() <= now.getTime()) {
    throw new WalletAuthError("SIWE nonce has expired.", 401);
  }

  const isValidMessage = validateSiweMessage({
    address: expectedAddress,
    domain: matchedOrigin.domain,
    message: parsed,
    nonce,
    scheme: parsed.scheme ? matchedOrigin.scheme : undefined,
    time: now,
  });

  if (!isValidMessage) {
    throw new WalletAuthError("SIWE message validation failed.", 401);
  }

  const isValidSignature = await publicClient.verifySiweMessage({
    address: expectedAddress,
    domain: matchedOrigin.domain,
    message: input.message,
    nonce,
    scheme: parsed.scheme ? matchedOrigin.scheme : undefined,
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
      body: JSON.stringify({
        p_nonce: nonce,
        p_state_hash: stateHash,
      }),
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
