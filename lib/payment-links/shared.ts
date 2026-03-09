import { isAddress } from "viem";

export const PAYMENT_LINK_STATUSES = [
  "active",
  "paid",
  "expired",
  "canceled",
] as const;

export const PAYMENT_ATTEMPT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "not_found",
] as const;

export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUSES)[number];
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export interface PaymentLinkRecord {
  id: string;
  slug: string;
  creator_address: string;
  creator_fid: number | null;
  creator_username: string | null;
  creator_display_name: string | null;
  creator_pfp_url: string | null;
  recipient_address: string;
  amount_usdc: number | string;
  title: string | null;
  note: string | null;
  status: PaymentLinkStatus;
  payment_id: string | null;
  payer_address: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PaymentAttemptRecord {
  id: string;
  payment_link_id: string;
  payment_id: string;
  status: PaymentAttemptStatus;
  created_at: string;
  updated_at: string;
}

export interface PublicPaymentLink {
  id: string;
  slug: string;
  creatorAddress: string;
  creatorFid: number | null;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  creatorPfpUrl: string | null;
  recipientAddress: string;
  amountUsdc: string;
  title: string | null;
  note: string | null;
  status: PaymentLinkStatus;
  paymentId: string | null;
  payerAddress: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreatePaymentLinkInput {
  amountUsdc: string;
  creatorAddress: string;
  creatorFid: number | null;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  creatorPfpUrl: string | null;
  recipientAddress: string;
  title: string | null;
  note: string | null;
  expiresAt: string | null;
}

export interface ConfirmPaymentLinkInput {
  paymentId: string;
  payerAddress: string | null;
  status: PaymentAttemptStatus;
}

interface CreatorIdentitySource {
  creatorAddress: string;
  creatorDisplayName: string | null;
  creatorUsername: string | null;
}

function trimToNull(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeOptionalFid(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionalAddress(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || !isAddress(trimmed)) {
    return null;
  }

  return trimmed;
}

export function normalizeUsdcAmount(value: unknown): string {
  const raw = typeof value === "number" ? value.toString() : String(value ?? "").trim();
  const amountPattern = /^\d+(\.\d{1,6})?$/;

  if (!amountPattern.test(raw)) {
    throw new Error("Amount must be a positive USDC value with up to 6 decimals.");
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  return parsed.toFixed(6).replace(/\.?0+$/, "");
}

export function normalizeAddress(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !isAddress(value.trim())) {
    throw new Error(`${fieldName} must be a valid Base address.`);
  }

  return value.trim();
}

export function normalizeExpiration(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expiration must be an ISO datetime string.");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Expiration must be a valid datetime.");
  }

  if (parsed.getTime() <= Date.now()) {
    throw new Error("Expiration must be in the future.");
  }

  return parsed.toISOString();
}

export function parseCreatePaymentLinkInput(value: unknown): CreatePaymentLinkInput {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid payment link payload.");
  }

  const payload = value as Record<string, unknown>;
  const recipientAddress = normalizeAddress(
    payload.recipientAddress,
    "Recipient address",
  );
  const creatorAddress =
    normalizeOptionalAddress(payload.creatorAddress) ?? recipientAddress;

  return {
    amountUsdc: normalizeUsdcAmount(payload.amountUsdc),
    creatorAddress,
    creatorFid: normalizeOptionalFid(payload.creatorFid),
    creatorUsername: trimToNull(payload.creatorUsername, 80),
    creatorDisplayName: trimToNull(payload.creatorDisplayName, 120),
    creatorPfpUrl: trimToNull(payload.creatorPfpUrl, 500),
    recipientAddress,
    title: trimToNull(payload.title, 120),
    note: trimToNull(payload.note, 500),
    expiresAt: normalizeExpiration(payload.expiresAt),
  };
}

export function parseConfirmPaymentLinkInput(
  value: unknown,
): ConfirmPaymentLinkInput {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid payment confirmation payload.");
  }

  const payload = value as Record<string, unknown>;
  const paymentId =
    typeof payload.paymentId === "string" ? payload.paymentId.trim() : "";
  const status =
    typeof payload.status === "string" ? payload.status.trim() : "";

  if (!paymentId) {
    throw new Error("Payment ID is required.");
  }

  if (!PAYMENT_ATTEMPT_STATUSES.includes(status as PaymentAttemptStatus)) {
    throw new Error("Payment status is invalid.");
  }

  return {
    paymentId,
    payerAddress: normalizeOptionalAddress(payload.payerAddress),
    status: status as PaymentAttemptStatus,
  };
}

export function isPaymentLinkExpired(link: {
  expires_at: string | null;
}): boolean {
  if (!link.expires_at) {
    return false;
  }

  return new Date(link.expires_at).getTime() <= Date.now();
}

export function createPaymentLinkSlug(): string {
  return `pl-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getCreatorIdentityParts(source: CreatorIdentitySource): {
  primary: string;
  secondary: string | null;
  address: string | null;
} {
  const shortenedAddress = shortenAddress(source.creatorAddress);

  if (source.creatorDisplayName) {
    return {
      primary: source.creatorDisplayName,
      secondary: source.creatorUsername ? `@${source.creatorUsername}` : null,
      address: shortenedAddress,
    };
  }

  if (source.creatorUsername) {
    return {
      primary: source.creatorUsername,
      secondary: null,
      address: shortenedAddress,
    };
  }

  return {
    primary: shortenedAddress,
    secondary: null,
    address: null,
  };
}

export function toPublicPaymentLink(link: PaymentLinkRecord): PublicPaymentLink {
  return {
    id: link.id,
    slug: link.slug,
    creatorAddress: link.creator_address,
    creatorFid: link.creator_fid,
    creatorUsername: link.creator_username,
    creatorDisplayName: link.creator_display_name,
    creatorPfpUrl: link.creator_pfp_url,
    recipientAddress: link.recipient_address,
    amountUsdc: normalizeUsdcAmount(link.amount_usdc),
    title: link.title,
    note: link.note,
    status: link.status,
    paymentId: link.payment_id,
    payerAddress: link.payer_address,
    expiresAt: link.expires_at,
    paidAt: link.paid_at,
    createdAt: link.created_at,
  };
}
