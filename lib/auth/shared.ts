import type { Address } from "viem";
import { getAddress, isAddress, isHex } from "viem";

export const PAY_LINK_SESSION_COOKIE = "pay_link_session";
export const PAY_LINK_PRE_AUTH_COOKIE = "pay_link_pre_auth";
export const PAY_LINK_CHAIN_ID = 8453;
export const PAY_LINK_CHAIN_HEX = "0x2105";
export const NONCE_TTL_MS = 10 * 60 * 1000;
export const PRE_AUTH_STATE_TTL_MS = NONCE_TTL_MS;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SIWE_FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface WalletSession {
  address: Address;
  issuedAt: string;
  expiresAt: string;
}

export interface WalletSessionResponse {
  session: WalletSession | null;
}

export interface WalletNonceResponse {
  nonce: string;
}

export interface VerifyWalletSessionInput {
  address?: Address | null;
  message: string;
  signature: `0x${string}`;
}

export function normalizeWalletAddress(
  value: unknown,
  fieldName = "Address",
): Address {
  if (typeof value !== "string" || !isAddress(value.trim())) {
    throw new Error(`${fieldName} must be a valid Base address.`);
  }

  return getAddress(value.trim());
}

export function normalizeWalletSignature(
  value: unknown,
): `0x${string}` {
  if (typeof value !== "string" || !isHex(value)) {
    throw new Error("Signature must be a valid hex string.");
  }

  return value;
}
