import { getAddress, isAddress } from "viem";

export const PAYMENT_LINK_STATUS = {
  ACTIVE: "active",
  PAID: "paid",
  EXPIRED: "expired",
  CANCELED: "canceled",
} as const;

export const PAYMENT_ATTEMPT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  NOT_FOUND: "not_found",
} as const;

export const PAYMENT_LINK_STATUSES = Object.values(PAYMENT_LINK_STATUS);
export const PAYMENT_ATTEMPT_STATUSES = Object.values(PAYMENT_ATTEMPT_STATUS);

export type PaymentLinkStatus =
  (typeof PAYMENT_LINK_STATUS)[keyof typeof PAYMENT_LINK_STATUS];
export type PaymentAttemptStatus =
  (typeof PAYMENT_ATTEMPT_STATUS)[keyof typeof PAYMENT_ATTEMPT_STATUS];

export const PAYMENT_LINK_EXPIRATION_PRESET = {
  ONE_HOUR: "1_hour",
  TWELVE_HOURS: "12_hours",
  ONE_DAY: "1_day",
  SEVEN_DAYS: "7_days",
  THIRTY_DAYS: "30_days",
  NEVER: "never",
} as const;

export type PaymentLinkExpirationPreset =
  (typeof PAYMENT_LINK_EXPIRATION_PRESET)[keyof typeof PAYMENT_LINK_EXPIRATION_PRESET];

export const PAYMENT_LINK_EXPIRATION_OPTIONS: ReadonlyArray<{
  label: string;
  value: PaymentLinkExpirationPreset;
}> = [
  { label: "1 hour", value: PAYMENT_LINK_EXPIRATION_PRESET.ONE_HOUR },
  { label: "12 hours", value: PAYMENT_LINK_EXPIRATION_PRESET.TWELVE_HOURS },
  { label: "1 day", value: PAYMENT_LINK_EXPIRATION_PRESET.ONE_DAY },
  { label: "7 days", value: PAYMENT_LINK_EXPIRATION_PRESET.SEVEN_DAYS },
  { label: "30 days", value: PAYMENT_LINK_EXPIRATION_PRESET.THIRTY_DAYS },
  { label: "Never", value: PAYMENT_LINK_EXPIRATION_PRESET.NEVER },
] as const;

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
  walletAddress: string;
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
  title: string | null;
  note: string | null;
  expiresAt: string | null;
}

export interface ConfirmPaymentLinkInput {
  paymentId: string;
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

export function isPaymentLinkStatus(value: unknown): value is PaymentLinkStatus {
  return typeof value === "string" && PAYMENT_LINK_STATUSES.includes(value as PaymentLinkStatus);
}

export function isPaymentAttemptStatus(
  value: unknown,
): value is PaymentAttemptStatus {
  return typeof value === "string" &&
    PAYMENT_ATTEMPT_STATUSES.includes(value as PaymentAttemptStatus);
}

function isPaymentLinkExpirationPreset(
  value: unknown,
): value is PaymentLinkExpirationPreset {
  return typeof value === "string" &&
    Object.values(PAYMENT_LINK_EXPIRATION_PRESET).includes(
      value as PaymentLinkExpirationPreset,
    );
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

  return getAddress(value.trim());
}

export function normalizePaymentId(value: unknown): string {
  const paymentId =
    typeof value === "string" ? value.trim() : "";

  if (!/^0x[a-fA-F0-9]{64}$/.test(paymentId)) {
    throw new Error("Payment ID must be a valid transaction hash.");
  }

  return paymentId;
}

export function normalizeExpirationPreset(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (!isPaymentLinkExpirationPreset(value)) {
    throw new Error("Expiration must use a supported option.");
  }

  const now = Date.now();

  switch (value) {
    case PAYMENT_LINK_EXPIRATION_PRESET.ONE_HOUR:
      return new Date(now + 60 * 60 * 1000).toISOString();
    case PAYMENT_LINK_EXPIRATION_PRESET.TWELVE_HOURS:
      return new Date(now + 12 * 60 * 60 * 1000).toISOString();
    case PAYMENT_LINK_EXPIRATION_PRESET.ONE_DAY:
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case PAYMENT_LINK_EXPIRATION_PRESET.SEVEN_DAYS:
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case PAYMENT_LINK_EXPIRATION_PRESET.THIRTY_DAYS:
      return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    case PAYMENT_LINK_EXPIRATION_PRESET.NEVER:
      return null;
    default:
      throw new Error("Expiration must use a supported option.");
  }
}

export function parseCreatePaymentLinkInput(value: unknown): CreatePaymentLinkInput {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid payment link payload.");
  }

  const payload = value as Record<string, unknown>;
  const creatorAddress = normalizeAddress(
    payload.creatorAddress,
    "Creator address",
  );

  return {
    amountUsdc: normalizeUsdcAmount(payload.amountUsdc),
    creatorAddress,
    creatorFid: normalizeOptionalFid(payload.creatorFid),
    creatorUsername: trimToNull(payload.creatorUsername, 80),
    creatorDisplayName: trimToNull(payload.creatorDisplayName, 120),
    creatorPfpUrl: trimToNull(payload.creatorPfpUrl, 500),
    title: trimToNull(payload.title, 120),
    note: trimToNull(payload.note, 500),
    expiresAt: normalizeExpirationPreset(
      payload.expirationPreset ?? PAYMENT_LINK_EXPIRATION_PRESET.NEVER,
    ),
  };
}

export function parseConfirmPaymentLinkInput(
  value: unknown,
): ConfirmPaymentLinkInput {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid payment confirmation payload.");
  }

  const payload = value as Record<string, unknown>;

  return {
    paymentId: normalizePaymentId(payload.paymentId),
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
    walletAddress: link.recipient_address,
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
